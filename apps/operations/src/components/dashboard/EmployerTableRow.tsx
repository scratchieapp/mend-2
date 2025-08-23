import { TableCell, TableRow } from "@/components/ui/table";

interface Employer {
  employer_id: number;
  employer_name: string;
  employer_state: string;
  employer_post_code: string;
  employment_arrangement: string;
}

interface EmployerTableRowProps {
  employer: Employer;
  onRowClick: (employerId: number) => void;
}

export const EmployerTableRow = ({ employer, onRowClick }: EmployerTableRowProps) => {
  return (
    <TableRow 
      onClick={() => onRowClick(employer.employer_id)}
      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <TableCell className="font-medium">{employer.employer_name}</TableCell>
      <TableCell>{employer.employer_state}</TableCell>
      <TableCell>{employer.employer_post_code}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          employer.employment_arrangement === 'Team Member' 
            ? 'bg-green-100 text-green-800' 
            : employer.employment_arrangement === 'Contractor'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {employer.employment_arrangement}
        </span>
      </TableCell>
    </TableRow>
  );
};