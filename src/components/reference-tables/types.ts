export interface TableOption {
  name: string;
  title: string;
  label: string;
  value: string;
  table: string;
  columns: string[];
  idColumn: string;
}

// Generic type for table row data - can represent any reference table row
export type TableRowData = Record<string, unknown>;

export const tableOptions: TableOption[] = [
  {
    name: 'aoi_codes',
    title: 'Agency of Injury Codes',
    label: 'Agency of Injury Codes',
    value: 'aoi_codes',
    table: 'agency_of_injury_codes',
    columns: ['aoi_code_main', 'aoi_code_sub', 'aoi_description'],
    idColumn: 'aoi_code_id'
  },
  {
    name: 'bl_codes',
    title: 'Bodily Location Codes',
    label: 'Bodily Location Codes',
    value: 'bl_codes',
    table: 'bodily_location_codes',
    columns: ['bl_code_main', 'bl_code_sub', 'bl_description'],
    idColumn: 'bl_code_id'
  },
  {
    name: 'claim_types',
    title: 'Claim Types',
    label: 'Claim Types',
    value: 'claim_types',
    table: 'claim_types',
    columns: ['claim_type_name'],
    idColumn: 'claim_type_id'
  },
  {
    name: 'moi_codes',
    title: 'Mechanism of Injury Codes',
    label: 'Mechanism of Injury Codes',
    value: 'moi_codes',
    table: 'mechanism_of_injury_codes',
    columns: ['moi_code_main', 'moi_code_sub', 'moi_description'],
    idColumn: 'moi_code_id'
  },
  {
    name: 'noi_codes',
    title: 'Nature of Injury Codes',
    label: 'Nature of Injury Codes',
    value: 'noi_codes',
    table: 'nature_of_injury_codes',
    columns: ['noi_code_main', 'noi_code_sub', 'noi_description'],
    idColumn: 'noi_code_id'
  }
];