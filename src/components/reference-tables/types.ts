export interface TableOption {
  label: string;
  value: string;
  table: string;
  columns: string[];
}

export const tableOptions: TableOption[] = [
  {
    label: 'Agency of Injury Codes',
    value: 'aoi_codes',
    table: 'agency_of_injury_codes',
    columns: ['aoi_code_main', 'aoi_code_sub', 'aoi_description']
  },
  {
    label: 'Bodily Location Codes',
    value: 'bl_codes',
    table: 'bodily_location_codes',
    columns: ['bl_code_main', 'bl_code_sub', 'bl_description']
  },
  {
    label: 'Claim Types',
    value: 'claim_types',
    table: 'claim_types',
    columns: ['claim_type_name']
  },
  {
    label: 'Mechanism of Injury Codes',
    value: 'moi_codes',
    table: 'mechanism_of_injury_codes',
    columns: ['moi_code_main', 'moi_code_sub', 'moi_description']
  },
  {
    label: 'Nature of Injury Codes',
    value: 'noi_codes',
    table: 'nature_of_injury_codes',
    columns: ['noi_code_main', 'noi_code_sub', 'noi_description']
  }
];