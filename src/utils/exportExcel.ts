import * as XLSX from "xlsx";
import { DesignParameters, CalculationResults } from "../types";
import { MATERIALS, INSULATION_MATERIALS, PROFILE_MATERIALS, CARGO_PROFILES } from "../constants";

export function exportExcel(design: DesignParameters, results: CalculationResults): void {
  const wb = XLSX.utils.book_new();
  const dT = Math.abs(design.ambientTemp - design.targetTemp);
  const ins = INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0];
  const skin = MATERIALS.find(m => m.id === design.skinMaterialId) || MATERIALS[0];
  const profMat = PROFILE_MATERIALS.find(m => m.id === design.profileMaterialId) || PROFILE_MATERIALS[0];
  const cargo = (CARGO_PROFILES as any)[design.activeCargo];

  // ── Sayfa 1: Özet ──────────────────────────────────────────────
  const summaryData = [
    ["THERMO-STATIC BOX — Teknik Rapor", "", "", ""],
    ["Rapor Tarihi", new Date().toLocaleDateString("tr-TR"), "", ""],
    ["", "", "", ""],
    ["BOYUTLAR", "", "", ""],
    ["Uzunluk (mm)", design.dimensions.length, "Genişlik (mm)", design.dimensions.width],
    ["Yükseklik (mm)", design.dimensions.height, "İç Hacim (m³)", results.internalVolume.toFixed(2)],
    ["Toplam Yüzey (m²)", results.totalSurfaceArea.toFixed(2), "Çelik Uzunluk (m)", results.totalSteelLength.toFixed(1)],
    ["", "", "", ""],
    ["MALZEMELEr", "", "", ""],
    ["Yalıtım", ins.name, "λ (W/mK)", ins.kValue],
    ["Kaplama", skin.name, "Yoğunluk (kg/m³)", skin.density],
    ["Profil", profMat.name, "E (MPa)", design.profileMaterialId === "aluminum" ? 70000 : 210000],
    ["", "", "", ""],
    ["PANEL KALINLIKLARI", "", "", ""],
    ["Yan Duvar (mm)", design.wallThickness, "Çatı (mm)", design.roofThickness],
    ["Zemin (mm)", design.floorThickness, "", ""],
    ["", "", "", ""],
    ["SICAKLIK & YÜK", "", "", ""],
    ["Dış Ortam (°C)", design.ambientTemp, "Hedef (°C)", design.targetTemp],
    ["ΔT (°C)", dT, "Rüzgar Yükü (Pa)", design.windLoad],
    ["Kargo", cargo.name, "Kargo Miktarı", design.cargoAmount],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Özet");

  // ── Sayfa 2: Termal Analiz ──────────────────────────────────────
  const thermalData = [
    ["TERMAL ANALİZ", "", "", ""],
    ["", "", "", ""],
    ["Parametre", "Değer", "Birim", "Açıklama"],
    ["Toplam Isı Kazancı", results.totalHeatGain.toFixed(1), "W", "Toplam ısı yük"],
    ["Panel İletim Kaybı", results.lossPanel.toFixed(1), "W", "Duvardan iletim"],
    ["Köşe/Bağlantı Kaybı", results.lossCorners.toFixed(1), "W", "PSI köşe kaybı"],
    ["Havalandırma Yükü", results.ventilationHeatLoad.toFixed(1), "W", "Hava değişimi"],
    ["Sızıntı Yükü", results.infiltrationLoad.toFixed(1), "W", "Hava infiltrasyonu"],
    ["İç Isı Yükü", results.internalHeatLoad.toFixed(1), "W", "Kargo metabolizması"],
    ["", "", "", ""],
    ["DUVAR BAZLI ISIL KAYIPLAR", "", "", ""],
    ["Duvar", "Toplam (W)", "Yalıtım (W)", "Köprü (W)"],
    ["Sol Yan", results.sideLoss.total.toFixed(1), results.sideLoss.insulation.toFixed(1), results.sideLoss.bridge.toFixed(1)],
    ["Ön / Arka", results.frontLoss.total.toFixed(1), results.frontLoss.insulation.toFixed(1), results.frontLoss.bridge.toFixed(1)],
    ["Çatı", results.roofLoss.total.toFixed(1), results.roofLoss.insulation.toFixed(1), results.roofLoss.bridge.toFixed(1)],
    ["Zemin", results.floorLoss.total.toFixed(1), results.floorLoss.insulation.toFixed(1), results.floorLoss.bridge.toFixed(1)],
    ["", "", "", ""],
    ["SOĞUTMA SİSTEMİ", "", "", ""],
    ["Parametre", "Değer", "Birim", ""],
    ["Gerekli Soğutma Kapasitesi", results.requiredCoolingCapacity.toFixed(1), "W", ""],
    ["Tahmini COP", results.copEstimated.toFixed(2), "-", ""],
    ["Kompresör Gücü", results.compressorPower.toFixed(2), "kW", ""],
    ["Soğutucu Akış Hızı", results.refrigerantMassFlow.toFixed(2), "kg/h", ""],
    ["Soğutucu Akışkan", design.refrigerant, "", ""],
    ["Evaporatör Sıcaklığı", design.evaporatorTemp, "°C", ""],
    ["Kondenser Sıcaklığı", design.condenserTemp, "°C", ""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(thermalData);
  ws2["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Termal Analiz");

  // ── Sayfa 3: Statik Analiz ──────────────────────────────────────
  const staticData = [
    ["STATİK ANALİZ", "", "", ""],
    ["", "", "", ""],
    ["Parametre", "Değer", "Birim", "Limit"],
    ["Max Yanal Sehim", results.maxDeflection.toFixed(2), "mm", `< ${(results.panelHeight * 1000 / 250).toFixed(1)} mm (L/250)`],
    ["Max Düşey Sehim", results.maxVerticalDeflection.toFixed(2), "mm", `< ${(results.saggingSpan / 250).toFixed(1)} mm (L/250)`],
    ["Max Gerilme", results.stress.toFixed(1), "MPa", "< 235 MPa (S235)"],
    ["Düşey Gerilme", results.verticalStress.toFixed(1), "MPa", ""],
    ["Güvenlik Faktörü (FoS)", results.fos.toFixed(2), "-", "> 1.5"],
    ["Yük Durumu", results.isSafe ? "GÜVENLİ" : "KONTROL GEREKLİ", "", ""],
    ["", "", "", ""],
    ["YÜK DAĞILIMI", "", "", ""],
    ["Yük Türü", "Değer", "Birim", ""],
    ["Ölü Yük", results.loadBreakdown.dead.toFixed(2), "N/mm", ""],
    ["Hareketli Yük", results.loadBreakdown.live.toFixed(2), "N/mm", ""],
    ["Profil Ağırlığı", results.loadBreakdown.profiles.toFixed(2), "N/mm", ""],
    ["", "", "", ""],
    ["KESİT BİLGİLERİ", "", "", ""],
    ["Profil Tipi", design.profileType === "box" ? "Kapalı Kutu" : "C Profil", "", ""],
    ["Profil Boyutu (mm)", `${design.profileWidth}x${design.profileDepth}x${design.profileThickness}`, "", ""],
    ["Etkin Atalet Momenti", results.I_eff.toFixed(0), "mm⁴", ""],
    ["Gerçek Aralık", results.actualPitch.toFixed(0), "mm", ""],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(staticData);
  ws3["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Statik Analiz");

  // ── Sayfa 4: Ağırlık & Geometri ────────────────────────────────
  const weightData = [
    ["AĞIRLIK & GEOMETRİ", "", ""],
    ["", "", ""],
    ["Parametre", "Değer", "Birim"],
    ["Çelik Ağırlığı", results.weightSteel.toFixed(1), "kg"],
    ["Yalıtım Ağırlığı", results.weightInsulation.toFixed(1), "kg"],
    ["Kaplama Ağırlığı", results.weightSkins.toFixed(1), "kg"],
    ["Boş Araç Ağırlığı", results.emptyWeight.toFixed(1), "kg"],
    ["Kargo Ağırlığı", results.cargoWeight.toFixed(1), "kg"],
    ["Toplam Brüt Ağırlık", results.totalGrossWeight.toFixed(1), "kg"],
    ["", "", ""],
    ["Panel Başına Yük (seçili duvar)", results.panelTotalWeight.toFixed(1), "kg"],
    ["Panel Birim Ağırlık", results.panelTotalUnitWeight.toFixed(2), "kg/m²"],
    ["", "", ""],
    ["Ağırlık Merkezi X", results.cogX.toFixed(2), "m"],
    ["Ağırlık Merkezi Y", results.cogY.toFixed(2), "m"],
    ["Ağırlık Merkezi Z", results.cogZ.toFixed(2), "m"],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(weightData);
  ws4["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Ağırlık & Geometri");

  const fileName = `termal-statik-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
