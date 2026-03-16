export type Service = {
  id: string;
  priceRange: string;
};

export type SubCategory = {
  id: string;
  icon: string;
  services: Service[];
};

export type CategoryServices = {
  categoryId: string;
  subcategories: SubCategory[];
};

export const SERVICES: CategoryServices[] = [
  {
    categoryId: "plumbing",
    subcategories: [
      {
        id: "toilet",
        icon: "water",
        services: [
          { id: "toilet_unclog", priceRange: "100–200 €" },
          { id: "toilet_flush_repair", priceRange: "80–150 €" },
          { id: "toilet_leak", priceRange: "100–180 €" },
          { id: "toilet_install", priceRange: "250–450 €" },
          { id: "toilet_macerator", priceRange: "300–600 €" },
        ],
      },
      {
        id: "sink",
        icon: "water",
        services: [
          { id: "sink_unclog", priceRange: "100–220 €" },
          { id: "sink_faucet_repair", priceRange: "80–150 €" },
          { id: "sink_faucet_install", priceRange: "150–300 €" },
          { id: "sink_leak", priceRange: "100–200 €" },
        ],
      },
      {
        id: "shower",
        icon: "water",
        services: [
          { id: "shower_unclog", priceRange: "100–200 €" },
          { id: "shower_faucet_repair", priceRange: "100–180 €" },
          { id: "shower_seal_repair", priceRange: "120–150 €" },
          { id: "shower_install", priceRange: "400–800 €" },
        ],
      },
      {
        id: "pipes",
        icon: "git-branch",
        services: [
          { id: "pipe_leak_repair", priceRange: "150–250 €" },
          { id: "pipe_leak_detection", priceRange: "150–300 €" },
          { id: "pipe_replacement", priceRange: "200–500 €" },
        ],
      },
      {
        id: "water_heater",
        icon: "thermometer",
        services: [
          { id: "water_heater_repair", priceRange: "150–300 €" },
          { id: "water_heater_install", priceRange: "400–800 €" },
          { id: "water_heater_leak", priceRange: "150–250 €" },
        ],
      },
    ],
  },
  {
    categoryId: "electrical",
    subcategories: [
      {
        id: "outlets_switches",
        icon: "power",
        services: [
          { id: "outlet_replace", priceRange: "100–150 €" },
          { id: "switch_replace", priceRange: "80–130 €" },
          { id: "multiple_outlet_failure", priceRange: "150–250 €" },
          { id: "dimmer_install", priceRange: "100–160 €" },
        ],
      },
      {
        id: "lighting",
        icon: "bulb",
        services: [
          { id: "lighting_failure", priceRange: "150–200 €" },
          { id: "luminaire_install", priceRange: "80–150 €" },
          { id: "outdoor_lighting", priceRange: "150–300 €" },
        ],
      },
      {
        id: "panel",
        icon: "apps",
        services: [
          { id: "panel_repair", priceRange: "150–300 €" },
          { id: "meter_failure", priceRange: "150–250 €" },
          { id: "panel_install", priceRange: "500–1200 €" },
          { id: "differential_install", priceRange: "200–350 €" },
        ],
      },
      {
        id: "electrical_misc",
        icon: "flash",
        services: [
          { id: "shutter_motor_repair", priceRange: "150–300 €" },
          { id: "smoke_detector_install", priceRange: "50–100 €" },
          { id: "electrical_diagnosis", priceRange: "100–200 €" },
        ],
      },
    ],
  },
  {
    categoryId: "locksmith",
    subcategories: [
      {
        id: "door_opening",
        icon: "lock-open",
        services: [
          { id: "simple_door_unlock", priceRange: "130–180 €" },
          { id: "armored_door_unlock", priceRange: "180–300 €" },
          { id: "jammed_door_open", priceRange: "150–250 €" },
        ],
      },
      {
        id: "locks",
        icon: "key",
        services: [
          { id: "lock_1point_install", priceRange: "250–450 €" },
          { id: "lock_3point_install", priceRange: "400–800 €" },
          { id: "lock_multipoint_install", priceRange: "500–900 €" },
          { id: "cylinder_replace", priceRange: "150–300 €" },
          { id: "lock_repair", priceRange: "100–200 €" },
        ],
      },
      {
        id: "doors",
        icon: "log-in",
        services: [
          { id: "door_reinforcement", priceRange: "300–600 €" },
          { id: "door_hinge_repair", priceRange: "100–200 €" },
          { id: "door_install", priceRange: "400–900 €" },
        ],
      },
      {
        id: "shutters",
        icon: "reorder",
        services: [
          { id: "shutter_repair", priceRange: "150–300 €" },
          { id: "shutter_install", priceRange: "300–600 €" },
          { id: "shutter_motor_install", priceRange: "250–500 €" },
        ],
      },
    ],
  },
  {
    categoryId: "heating",
    subcategories: [
      {
        id: "boiler",
        icon: "flame",
        services: [
          { id: "boiler_repair", priceRange: "250–330 €" },
          { id: "boiler_maintenance", priceRange: "150–180 €" },
          { id: "boiler_install", priceRange: "2500–3500 €" },
        ],
      },
      {
        id: "hot_water_tank",
        icon: "thermometer",
        services: [
          { id: "hot_water_tank_repair", priceRange: "250–350 €" },
          { id: "hot_water_tank_install", priceRange: "400–800 €" },
          { id: "hot_water_tank_leak", priceRange: "150–300 €" },
        ],
      },
      {
        id: "radiator",
        icon: "sunny",
        services: [
          { id: "radiator_repair", priceRange: "180–240 €" },
          { id: "radiator_install", priceRange: "250–500 €" },
          { id: "underfloor_heating_repair", priceRange: "200–400 €" },
        ],
      },
    ],
  },
  {
    categoryId: "ac",
    subcategories: [
      {
        id: "ac_repair",
        icon: "build",
        services: [
          { id: "ac_unit_repair", priceRange: "150–300 €" },
          { id: "ac_diagnosis", priceRange: "150–200 €" },
          { id: "ac_gas_refill", priceRange: "200–350 €" },
        ],
      },
      {
        id: "ac_install",
        icon: "snow",
        services: [
          { id: "ac_split_install", priceRange: "2000–3000 €" },
          { id: "ac_multi_split_install", priceRange: "3000–5000 €" },
          { id: "heat_pump_install", priceRange: "3000–6000 €" },
        ],
      },
      {
        id: "ac_maintenance",
        icon: "checkmark-circle",
        services: [
          { id: "ac_annual_maintenance", priceRange: "150–200 €" },
          { id: "ac_filter_cleaning", priceRange: "80–120 €" },
        ],
      },
    ],
  },
  {
    categoryId: "pest",
    subcategories: [
      {
        id: "insects",
        icon: "bug",
        services: [
          { id: "cockroach_treatment", priceRange: "6–12 €/m²" },
          { id: "ant_treatment", priceRange: "6–12 €/m²" },
          { id: "wasp_hornet_removal", priceRange: "200–250 €" },
          { id: "bedbug_treatment", priceRange: "10–14 €/m²" },
          { id: "bedbug_thermal", priceRange: "12–16 €/m²" },
        ],
      },
      {
        id: "rodents",
        icon: "alert-circle",
        services: [
          { id: "rat_treatment", priceRange: "6–12 €/m²" },
          { id: "mouse_treatment", priceRange: "6–12 €/m²" },
        ],
      },
      {
        id: "pest_maintenance",
        icon: "shield-checkmark",
        services: [
          { id: "pest_contract", priceRange: "4–7 €/m²" },
          { id: "pest_diagnosis", priceRange: "120–150 €" },
        ],
      },
    ],
  },
  {
    categoryId: "appliances",
    subcategories: [
      {
        id: "washing_machine",
        icon: "sync",
        services: [
          { id: "washer_repair", priceRange: "80–300 €" },
          { id: "washer_unclog", priceRange: "80–220 €" },
          { id: "washer_leak", priceRange: "80–300 €" },
          { id: "washer_install", priceRange: "100–200 €" },
        ],
      },
      {
        id: "dishwasher",
        icon: "restaurant",
        services: [
          { id: "dishwasher_repair", priceRange: "100–300 €" },
          { id: "dishwasher_unclog", priceRange: "80–200 €" },
          { id: "dishwasher_install", priceRange: "100–200 €" },
        ],
      },
      {
        id: "fridge",
        icon: "cube",
        services: [
          { id: "fridge_repair", priceRange: "120–300 €" },
          { id: "fridge_compressor", priceRange: "200–400 €" },
        ],
      },
      {
        id: "oven_cooktop",
        icon: "flame",
        services: [
          { id: "oven_repair", priceRange: "100–250 €" },
          { id: "cooktop_repair", priceRange: "100–200 €" },
          { id: "cooktop_replace", priceRange: "150–250 €" },
        ],
      },
      {
        id: "dryer",
        icon: "sunny",
        services: [
          { id: "dryer_repair", priceRange: "100–250 €" },
        ],
      },
    ],
  },
  {
    categoryId: "glazing",
    subcategories: [
      {
        id: "glass",
        icon: "albums",
        services: [
          { id: "single_glass_replace", priceRange: "200–350 €" },
          { id: "double_glass_replace", priceRange: "400–600 €" },
          { id: "glass_emergency", priceRange: "150–300 €" },
        ],
      },
      {
        id: "windows",
        icon: "browsers",
        services: [
          { id: "window_pvc_install", priceRange: "500–800 €" },
          { id: "window_aluminium_install", priceRange: "800–1300 €" },
          { id: "window_repair", priceRange: "150–300 €" },
          { id: "window_handle_replace", priceRange: "200–300 €" },
        ],
      },
    ],
  },
  {
    categoryId: "smallworks",
    subcategories: [
      {
        id: "installation",
        icon: "build",
        services: [
          { id: "shelf_install", priceRange: "50–90 €" },
          { id: "curtain_rod_install", priceRange: "60–110 €" },
          { id: "tv_mount", priceRange: "70–120 €" },
          { id: "mirror_install", priceRange: "50–90 €" },
          { id: "blinds_install", priceRange: "60–100 €" },
        ],
      },
      {
        id: "assembly",
        icon: "construct",
        services: [
          { id: "furniture_assembly", priceRange: "70–150 €" },
          { id: "kitchen_assembly", priceRange: "150–400 €" },
          { id: "wardrobe_assembly", priceRange: "100–250 €" },
        ],
      },
      {
        id: "repairs",
        icon: "hammer",
        services: [
          { id: "door_repair", priceRange: "60–120 €" },
          { id: "furniture_repair", priceRange: "50–100 €" },
          { id: "general_handyman", priceRange: "50–90 €/h" },
        ],
      },
    ],
  },
  {
    categoryId: "renovation",
    subcategories: [
      {
        id: "painting",
        icon: "color-palette",
        services: [
          { id: "room_painting", priceRange: "15–25 €/m²" },
          { id: "facade_painting", priceRange: "20–35 €/m²" },
          { id: "ceiling_painting", priceRange: "15–25 €/m²" },
        ],
      },
      {
        id: "tiling",
        icon: "grid",
        services: [
          { id: "floor_tiling", priceRange: "30–50 €/m²" },
          { id: "wall_tiling", priceRange: "35–55 €/m²" },
          { id: "tile_repair", priceRange: "100–200 €" },
        ],
      },
      {
        id: "general_renovation",
        icon: "home",
        services: [
          { id: "bathroom_renovation", priceRange: "3000–8000 €" },
          { id: "kitchen_renovation", priceRange: "4000–12000 €" },
          { id: "full_renovation", priceRange: "__onQuote__" },
        ],
      },
    ],
  },
  {
    categoryId: "pool",
    subcategories: [
      {
        id: "pool_maintenance",
        icon: "water",
        services: [
          { id: "pool_cleaning", priceRange: "80–150 €" },
          { id: "pool_chemical_balance", priceRange: "60–120 €" },
          { id: "pool_maintenance_contract", priceRange: "150–300 €/mois" },
        ],
      },
      {
        id: "pool_repair",
        icon: "build",
        services: [
          { id: "pool_pump_repair", priceRange: "150–350 €" },
          { id: "pool_filter_repair", priceRange: "100–250 €" },
          { id: "pool_leak_repair", priceRange: "200–500 €" },
          { id: "pool_liner_repair", priceRange: "300–800 €" },
        ],
      },
      {
        id: "pool_install",
        icon: "add-circle",
        services: [
          { id: "pool_heat_pump", priceRange: "2000–4000 €" },
          { id: "pool_cover_install", priceRange: "500–2000 €" },
          { id: "pool_robot_install", priceRange: "300–800 €" },
        ],
      },
    ],
  },
  {
    categoryId: "garden",
    subcategories: [
      {
        id: "garden_maintenance",
        icon: "leaf",
        services: [
          { id: "lawn_mowing", priceRange: "30–60 €" },
          { id: "hedge_trimming", priceRange: "40–80 €" },
          { id: "tree_pruning", priceRange: "80–200 €" },
          { id: "garden_cleanup", priceRange: "50–120 €" },
        ],
      },
      {
        id: "garden_install",
        icon: "flower",
        services: [
          { id: "irrigation_install", priceRange: "300–800 €" },
          { id: "lawn_install", priceRange: "10–20 €/m²" },
          { id: "garden_design", priceRange: "__onQuote__" },
        ],
      },
      {
        id: "garden_repair",
        icon: "build",
        services: [
          { id: "irrigation_repair", priceRange: "80–200 €" },
          { id: "fence_repair", priceRange: "100–300 €" },
        ],
      },
    ],
  },
];

export function getServicesByCategory(categoryId: string): CategoryServices | undefined {
  return SERVICES.find((s) => s.categoryId === categoryId);
}
