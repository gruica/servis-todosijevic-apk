// Centralni sistem grafika za Frigo Sistem aplikaciju
// Sve generirane grafike organizovane po ulogama i kategorijama

// Status indikatori (već integrisani u mobile app)
import serviceTodoIcon from "@assets/generated_images/Servis_u_toku_ikona_7f9b93dc.png";
import serviceCompletedIcon from "@assets/generated_images/Završen_servis_ikona_82f0a1f3.png";
import servicePendingIcon from "@assets/generated_images/Čekanje_servis_ikona_6517986d.png";
import servicePartsIcon from "@assets/generated_images/Delovi_potrebni_ikona_168b4888.png";

// Admin grafike
import adminDashboardIcon from "@assets/generated_images/Admin_dashboard_ikona_9a17cdd8.png";
import analyticsIcon from "@assets/generated_images/Analytics_ikona_672fc743.png";
import serviceManagementIcon from "@assets/generated_images/Service_management_ikona_45f5d002.png";

// Technician grafike
import fridgeServiceIcon from "@assets/generated_images/Frižider_servis_ikona_5321aedb.png";
import washingMachineServiceIcon from "@assets/generated_images/Veš_mašina_servis_ikona_535d6e05.png";
import dishwasherServiceIcon from "@assets/generated_images/Sudopera_servis_ikona_4debec4c.png";
import stoveServiceIcon from "@assets/generated_images/Šporet_servis_ikona_e33078bf.png";
import mobileTechnicianIcon from "@assets/generated_images/Mobilni_tehničar_ikona_364ad5cd.png";

// Business i Customer grafike
import businessPartnerIcon from "@assets/generated_images/Business_partner_ikona_95818f55.png";
import customerIcon from "@assets/generated_images/Customer_ikona_7346fc7b.png";
import serviceTrackingIcon from "@assets/generated_images/Service_tracking_ikona_e4e32d91.png";
import communicationIcon from "@assets/generated_images/Komunikacija_ikona_87ebc7ca.png";

// Brand grafike
import bekoIcon from "@assets/generated_images/Beko_brand_ikona_c310bb31.png";
import candyIcon from "@assets/generated_images/Candy_brand_ikona_7fa20f84.png";

// Dashboard hero grafike
import dashboardHeroGraphic from "@assets/generated_images/Dashboard_hero_grafika_92fc5be5.png";

// Additional system icons
import warehouseIcon from "@assets/generated_images/Warehouse_storage_icon_03c320d6.png";
import partsCatalogIcon from "@assets/generated_images/Parts_catalog_icon_68b7bf44.png";
import webScrapingIcon from "@assets/generated_images/Web_scraping_icon_273603b7.png";
import userManagementIcon from "@assets/generated_images/User_management_icon_ad4e61f4.png";
import bulkSMSIcon from "@assets/generated_images/Bulk_SMS_icon_193f0432.png";

// App Icons organizovane po kategorijama
export const AppIcons = {
  // Status indikatori
  status: {
    inProgress: serviceTodoIcon,
    completed: serviceCompletedIcon,
    pending: servicePendingIcon,
    waitingParts: servicePartsIcon,
  },

  // Admin ikone
  admin: {
    dashboard: adminDashboardIcon,
    analytics: analyticsIcon,
    serviceManagement: serviceManagementIcon,
    hero: dashboardHeroGraphic,
  },

  // Appliance category ikone
  appliances: {
    refrigerator: fridgeServiceIcon,
    washingMachine: washingMachineServiceIcon,
    dishwasher: dishwasherServiceIcon,
    stove: stoveServiceIcon,
  },

  // Technician ikone
  technician: {
    mobile: mobileTechnicianIcon,
    serviceWork: serviceTodoIcon,
  },

  // Business ikone
  business: {
    partner: businessPartnerIcon,
    tracking: serviceTrackingIcon,
    communication: communicationIcon,
  },

  // Customer ikone
  customer: {
    profile: customerIcon,
    tracking: serviceTrackingIcon,
    communication: communicationIcon,
  },

  // Brand ikone
  brands: {
    beko: bekoIcon,
    candy: candyIcon,
  },

  // System management ikone
  system: {
    warehouse: warehouseIcon,
    partsCatalog: partsCatalogIcon,
    webScraping: webScrapingIcon,
    userManagement: userManagementIcon,
    bulkSMS: bulkSMSIcon,
  },
};

// Utility funkcije za lakše korišćenje
export const getApplianceIcon = (category: string) => {
  const categoryMap: Record<string, string> = {
    'frižider': AppIcons.appliances.refrigerator,
    'frizider': AppIcons.appliances.refrigerator,
    'refrigerator': AppIcons.appliances.refrigerator,
    'veš mašina': AppIcons.appliances.washingMachine,
    'ves masina': AppIcons.appliances.washingMachine,
    'washing machine': AppIcons.appliances.washingMachine,
    'sudopera': AppIcons.appliances.dishwasher,
    'mašina za pranje sudova': AppIcons.appliances.dishwasher,
    'dishwasher': AppIcons.appliances.dishwasher,
    'šporet': AppIcons.appliances.stove,
    'sporet': AppIcons.appliances.stove,
    'stove': AppIcons.appliances.stove,
  };
  
  return categoryMap[category.toLowerCase()] || AppIcons.appliances.refrigerator;
};

export const getBrandIcon = (brand: string) => {
  const brandMap: Record<string, string> = {
    'beko': AppIcons.brands.beko,
    'candy': AppIcons.brands.candy,
  };
  
  return brandMap[brand.toLowerCase()];
};

export const getStatusIcon = (status: string) => {
  const statusMap: Record<string, string> = {
    'in_progress': AppIcons.status.inProgress,
    'completed': AppIcons.status.completed,
    'pending': AppIcons.status.pending,
    'assigned': AppIcons.status.pending,
    'scheduled': AppIcons.status.pending,
    'waiting_parts': AppIcons.status.waitingParts,
  };
  
  return statusMap[status] || AppIcons.status.pending;
};

// Export pojedinačnih ikona za lakši import
export {
  serviceTodoIcon,
  serviceCompletedIcon,
  servicePendingIcon,
  servicePartsIcon,
  adminDashboardIcon,
  analyticsIcon,
  serviceManagementIcon,
  fridgeServiceIcon,
  washingMachineServiceIcon,
  dishwasherServiceIcon,
  stoveServiceIcon,
  mobileTechnicianIcon,
  businessPartnerIcon,
  customerIcon,
  serviceTrackingIcon,
  communicationIcon,
  bekoIcon,
  candyIcon,
  dashboardHeroGraphic,
  warehouseIcon,
  partsCatalogIcon,
  webScrapingIcon,
  userManagementIcon,
  bulkSMSIcon,
};