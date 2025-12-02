import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, User, Building, AlertTriangle, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type SearchType = 'workers' | 'incidents' | 'sites';

interface SearchResult {
  type: SearchType;
  id: number | string;
  title: string;
  subtitle: string;
  metadata?: string;
  link: string;
}

const SearchVerifyAdmin = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType | 'all'>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const employerId = userData?.employer_id ? parseInt(userData.employer_id) : null;

  // Search workers
  const { data: workers = [], isLoading: loadingWorkers } = useQuery({
    queryKey: ['search-workers', searchQuery, employerId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      let query = supabase
        .from('workers')
        .select('worker_id, given_name, family_name, occupation, mobile_phone, employer_id')
        .or(`given_name.ilike.%${searchQuery}%,family_name.ilike.%${searchQuery}%,mobile_phone.ilike.%${searchQuery}%`)
        .limit(20);
      
      // Filter by employer for non-super-admin
      if (employerId && userData?.role_id !== 1) {
        query = query.eq('employer_id', employerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasSearched && searchQuery.length >= 2 && (searchType === 'all' || searchType === 'workers'),
  });

  // Search incidents
  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ['search-incidents', searchQuery, employerId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      let query = supabase
        .from('incidents')
        .select('incident_id, incident_number, injury_type, classification, date_of_injury, employer_id, worker_id')
        .or(`incident_number.ilike.%${searchQuery}%,injury_type.ilike.%${searchQuery}%,injury_description.ilike.%${searchQuery}%`)
        .is('deleted_at', null)
        .limit(20);
      
      // Filter by employer for non-super-admin
      if (employerId && userData?.role_id !== 1) {
        query = query.eq('employer_id', employerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasSearched && searchQuery.length >= 2 && (searchType === 'all' || searchType === 'incidents'),
  });

  // Search sites
  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: ['search-sites', searchQuery, employerId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      let query = supabase
        .from('sites')
        .select('site_id, site_name, city, state, employer_id')
        .or(`site_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        .limit(20);
      
      // Filter by employer for non-super-admin
      if (employerId && userData?.role_id !== 1) {
        query = query.eq('employer_id', employerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasSearched && searchQuery.length >= 2 && (searchType === 'all' || searchType === 'sites'),
  });

  const isLoading = loadingWorkers || loadingIncidents || loadingSites;

  // Combine results
  const results: SearchResult[] = [
    ...(searchType === 'all' || searchType === 'workers' ? workers.map(w => ({
      type: 'workers' as SearchType,
      id: w.worker_id,
      title: `${w.given_name || ''} ${w.family_name || ''}`.trim() || 'Unknown Worker',
      subtitle: w.occupation || 'No occupation listed',
      metadata: w.mobile_phone || undefined,
      link: `/builder/workers?search=${encodeURIComponent(w.given_name || '')}`,
    })) : []),
    ...(searchType === 'all' || searchType === 'incidents' ? incidents.map(i => ({
      type: 'incidents' as SearchType,
      id: i.incident_id,
      title: i.incident_number || `INC-${i.incident_id}`,
      subtitle: i.injury_type || 'No injury type',
      metadata: i.date_of_injury ? format(new Date(i.date_of_injury), 'dd MMM yyyy') : undefined,
      link: `/incident/${i.incident_id}`,
    })) : []),
    ...(searchType === 'all' || searchType === 'sites' ? sites.map(s => ({
      type: 'sites' as SearchType,
      id: s.site_id,
      title: s.site_name,
      subtitle: `${s.city || ''}${s.city && s.state ? ', ' : ''}${s.state || ''}`,
      link: `/builder/site-management`,
    })) : []),
  ];

  const handleSearch = () => {
    if (searchQuery.length >= 2) {
      setHasSearched(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getTypeIcon = (type: SearchType) => {
    switch (type) {
      case 'workers': return <User className="h-4 w-4" />;
      case 'incidents': return <AlertTriangle className="h-4 w-4" />;
      case 'sites': return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: SearchType) => {
    switch (type) {
      case 'workers': return 'bg-blue-100 text-blue-800';
      case 'incidents': return 'bg-red-100 text-red-800';
      case 'sites': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Search className="h-8 w-8" />
          Search & Verify
        </h1>
        <p className="text-muted-foreground">Search across workers, incidents, and sites</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Search type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="workers">Workers</SelectItem>
                <SelectItem value="incidents">Incidents</SelectItem>
                <SelectItem value="sites">Sites</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Search by name, incident number, site name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 2}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2">Enter at least 2 characters to search</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Search Results
              {results.length > 0 && (
                <Badge variant="secondary" className="ml-2">{results.length} found</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No results found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try a different search term or type</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(result.link)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getTypeBadgeColor(result.type)}`}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.metadata && (
                        <span className="text-sm text-muted-foreground">{result.metadata}</span>
                      )}
                      <Badge variant="outline" className="capitalize">{result.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help text when no search yet */}
      {!hasSearched && (
        <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">Search across your data</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Enter a search term above to find workers by name or phone, 
              incidents by number or description, or sites by name or location.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchVerifyAdmin;
