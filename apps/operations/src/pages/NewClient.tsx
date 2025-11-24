import { NewClientForm } from "@/components/forms/NewClientForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NewClient = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="pt-16 p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account-manager")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Add New Client
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Enter the client's details below
              </p>
            </div>
          </div>

          <NewClientForm />
        </div>
      </div>
    </div>
  );
};

export default NewClient;