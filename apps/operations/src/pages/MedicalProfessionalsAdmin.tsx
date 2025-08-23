import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuBar } from "@/components/MenuBar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MedicalProfessional {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty: string;
  phone_number: string;
  email: string;
  address: string;
  suburb: string;
  state: string;
  post_code: string;
  registration_number: string;
}

export default function MedicalProfessionalsAdmin() {
  const { data: medicalProfessionals, isLoading } = useQuery({
    queryKey: ['medicalProfessionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('*')
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as MedicalProfessional[];
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="h-8 w-8" />
                Medical Professionals
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage healthcare provider directory
              </p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Medical Professional
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicalProfessionals?.map((doctor) => (
                    <TableRow 
                      key={doctor.doctor_id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <TableCell className="font-medium">
                        {`${doctor.first_name} ${doctor.last_name}`}
                      </TableCell>
                      <TableCell>{doctor.specialty}</TableCell>
                      <TableCell>
                        <div>
                          <div>{doctor.phone_number}</div>
                          <div className="text-sm text-gray-500">{doctor.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{doctor.suburb}</div>
                          <div className="text-sm text-gray-500">
                            {`${doctor.state}, ${doctor.post_code}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{doctor.registration_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}