import { useQuery } from '@tanstack/react-query';
import { getEmployers } from '@/lib/supabase/queries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function RecentClientsTable() {
  const { data: employers, isLoading, error } = useQuery({
    queryKey: ['employers'],
    queryFn: getEmployers
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading clients</div>;
  if (!employers?.length) return <div>No clients found</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client Name</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employers.map((employer) => (
          <TableRow key={employer.employer_id}>
            <TableCell>{employer.employer_name}</TableCell>
            <TableCell>{employer.employer_state}</TableCell>
            <TableCell>{employer.manager_name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}