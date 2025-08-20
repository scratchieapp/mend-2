import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import { TableCell } from "@/components/ui/table";

interface Employer {
  employer_id: number;
  employer_name: string;
  employer_state: string;
  employer_post_code: string;
  abn: string;
  active_sites_count?: number;
  lti_rate?: number;
}

interface EmployersTableProps {
  employers: Employer[];
  onRowClick: (employerId: number) => void;
}

export const EmployersTable = ({ employers, onRowClick }: EmployersTableProps) => {
  if (employers.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No employers found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Post Code</TableHead>
          <TableHead>Active Sites</TableHead>
          <TableHead>6-Month Rolling LTI Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employers.map((employer) => (
          <TableRow 
            key={employer.employer_id}
            onClick={() => onRowClick(employer.employer_id)}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <TableCell className="font-medium">{employer.employer_name}</TableCell>
            <TableCell>{employer.employer_state}</TableCell>
            <TableCell>{employer.employer_post_code}</TableCell>
            <TableCell>{employer.active_sites_count || 0}</TableCell>
            <TableCell>{employer.lti_rate ? `${employer.lti_rate.toFixed(2)}%` : '0.00%'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};