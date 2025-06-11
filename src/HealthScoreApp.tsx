import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Import local storage utilities
import { 
  saveToLocalStorage, 
  loadFromLocalStorage, 
  saveDataType, 
  hasStoredData,
  getStorageInfo,
  clearLocalStorage,
  exportData,
  importData
} from "@/lib/localStorage";

// Import professional icons from react-icons
import { 
  MdDashboard, 
  MdAdd, 
  MdSettings, 
  MdStar, 
  MdPeople,
  MdFileDownload,
  MdFileUpload,
  MdAssessment,
  MdBusiness,
  MdTrendingUp,
  MdTrendingDown,
  MdTrendingFlat,
  MdLoop,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdArrowUpward,
  MdArrowDownward,
  MdDateRange,
  MdRefresh,
  MdTableChart,
  MdVisibility,
  MdVisibilityOff,
  MdCloudUpload,
  MdDescription,
  MdAttachMoney,
  MdSentimentSatisfied,
  MdConfirmationNumber,
  MdDragHandle,
  MdAutoAwesome,
  MdSave
} from 'react-icons/md';

import { 
  FiPlus, 
  FiSettings, 
  FiUsers, 
  FiDownload, 
  FiUpload,
  FiBarChart,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';

import { 
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineStar
} from 'react-icons/hi';

interface Metric {
  id: string;
  name: string;
  weight: number;
  inputType: "manual" | "upload";
  lowerBand: number;
  upperBand: number;
  lowerIsBetter: boolean;
  useTrending: boolean;
}

interface ScoreGroup {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  action: string;
  color: string;
}

interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  options?: string[];
}

interface Merchant {
  id: string;
  name: string;
  accountId: string;
  month: string;
  year: string;
  
  // Dynamic metric values - can be single number or array of 4 numbers for trending
  metricValues: Record<string, number | number[]>;
  
  // Custom field values
  customFields: Record<string, any>;
  
  // Calculated fields
  score: number;
  status: string;
  action: string;
}

interface DataSubmission {
  id: string;
  metricId: string;
  metricName: string;
  month: string;
  year: string;
  fileName: string;
  submittedAt: string;
  status: "pending" | "processed" | "error";
}

interface FieldMapping {
  csvColumn: string;
  appField: string;
  transformation?: string;
  isRequired: boolean;
}

interface MappingProfile {
  id: string;
  name: string;
  description: string;
  source: string; // "Intercom", "StoreHub", "Internal", etc.
  createdAt: string;
  lastUsed: string;
  fieldMappings: FieldMapping[];
  settings: {
    dateFormat: string;
    numberFormat: string;
    skipFirstRow: boolean;
    delimiter: string;
  };
}

interface TransformationRule {
  id: string;
  name: string;
  type: "date" | "number" | "text" | "split" | "aggregate";
  description: string;
  function: string;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SelectItem Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            There was an error with the selection component. Please refresh the page.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const HealthScoreApp = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'customer', 'score', 'status', 'action'
  ]);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showCSVUploader, setShowCSVUploader] = useState(false);

  // Storage states
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Mapping Profile states
  const [mappingProfiles, setMappingProfiles] = useState<MappingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Initialize all state with localStorage data or defaults
  const initializeState = () => {
    if (hasStoredData()) {
      const savedData = loadFromLocalStorage();
      return {
        metrics: savedData.metrics.length > 0 ? savedData.metrics : getDefaultMetrics(),
        scoreGroups: savedData.scoreGroups.length > 0 ? savedData.scoreGroups : getDefaultScoreGroups(),
        customFields: savedData.customFields.length > 0 ? savedData.customFields : getDefaultCustomFields(),
        merchants: savedData.merchants,
        selectedColumns: savedData.selectedColumns.length > 0 ? savedData.selectedColumns : ['customer', 'score', 'status', 'action'],
        dataSubmissions: savedData.dataSubmissions,
        mappingProfiles: savedData.mappingProfiles || []
      };
    }
    return {
      metrics: getDefaultMetrics(),
      scoreGroups: getDefaultScoreGroups(),
      customFields: getDefaultCustomFields(),
      merchants: [],
      selectedColumns: ['customer', 'score', 'status', 'action'],
      dataSubmissions: [],
      mappingProfiles: []
    };
  };

  // Default data functions
  const getDefaultMetrics = (): Metric[] => [
    { id: "1", name: "Ticket", weight: 30, inputType: "upload", lowerBand: 0, upperBand: 24, lowerIsBetter: true, useTrending: true },
    { id: "2", name: "Adoption", weight: 20, inputType: "upload", lowerBand: 0, upperBand: 100, lowerIsBetter: false, useTrending: false },
    { id: "3", name: "GMV", weight: 25, inputType: "upload", lowerBand: 0, upperBand: 1000000, lowerIsBetter: false, useTrending: false },
    { id: "4", name: "Sentiment", weight: 25, inputType: "manual", lowerBand: 1, upperBand: 10, lowerIsBetter: false, useTrending: false }
  ];

  const getDefaultScoreGroups = (): ScoreGroup[] => [
    { id: "1", name: "Green", minScore: 90, maxScore: 100, action: "Excellent performance - continue current strategy", color: "bg-green-100 text-green-800 border-green-200" },
    { id: "2", name: "Yellow", minScore: 70, maxScore: 89, action: "Good performance - monitor closely and follow-up within 7 days", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    { id: "3", name: "Red", minScore: 0, maxScore: 69, action: "Poor performance - urgent escalation and intervention within 24 hours", color: "bg-red-100 text-red-800 border-red-200" },
    { id: "4", name: "Grey", minScore: 0, maxScore: 0, action: "Neutral status - awaiting data or assessment", color: "bg-gray-100 text-gray-800 border-gray-200" }
  ];

  const getDefaultCustomFields = (): CustomField[] => [
    { id: "1", name: "Industry", type: "select", required: true, options: ["Retail", "Healthcare", "Finance", "Technology"] },
    { id: "2", name: "Contract Value", type: "number", required: false },
    { id: "3", name: "Start Date", type: "date", required: true }
  ];

  // Initialize state
  const initialState = initializeState();
  
  // State for metrics
  const [metrics, setMetrics] = useState<Metric[]>(initialState.metrics);

  const [customFields, setCustomFields] = useState<CustomField[]>(initialState.customFields);

  const [scoreGroups, setScoreGroups] = useState<ScoreGroup[]>(initialState.scoreGroups);

  // Initialize mapping profiles from localStorage
  useEffect(() => {
    setMappingProfiles(initialState.mappingProfiles);
  }, []);

  // Dynamic helper function to calculate health score based on current metrics
  const calculateHealthScore = (merchantMetricValues: Record<string, number | number[]>) => {
    if (metrics.length === 0) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;

    metrics.forEach(metric => {
      const value = merchantMetricValues[metric.id] || 0;
      let normalizedScore = 0;
      
      if (metric.useTrending && Array.isArray(value) && value.length === 4) {
        // Trending analysis: [M1, M2, M3, M4] where M4 is most recent
        const [m1, m2, m3, m4] = value;
        
        // Trending Up: M1 < M2 AND M2 < M3 AND M3 < M4
        if (m1 < m2 && m2 < m3 && m3 < m4) {
          normalizedScore = 100; // Highest health
        }
        // Trending Equal: M1 = M2 AND M2 = M3 AND M3 = M4  
        else if (m1 === m2 && m2 === m3 && m3 === m4) {
          normalizedScore = 75; // Stable, generally good
        }
        // Trending Down: M1 > M2 AND M2 > M3 AND M3 > M4
        else if (m1 > m2 && m2 > m3 && m3 > m4) {
          normalizedScore = 25; // Lowest health, concerning
        }
        // Mixed: Everything else
        else {
          normalizedScore = 50; // Uncertainty, potential issues
        }
        
        // For trending metrics, we may want to reverse the logic for "lowerIsBetter"
        // but let's keep it simple for now since trending has its own scoring
        
      } else if (typeof value === 'number') {
        // Single value analysis (existing logic)
        if (metric.lowerIsBetter) {
          // Lower is better - calculate score based on how close to lowerBand
          normalizedScore = Math.max(0, Math.min(100, ((metric.upperBand - value) / (metric.upperBand - metric.lowerBand)) * 100));
        } else {
          // Higher is better - calculate score based on how close to upperBand
          const range = metric.upperBand - metric.lowerBand;
          normalizedScore = Math.max(0, Math.min(100, ((value - metric.lowerBand) / range) * 100));
        }
      } else {
        // Invalid data - use 0 score
        normalizedScore = 0;
      }
      
      totalWeightedScore += normalizedScore * (metric.weight / 100);
      totalWeight += metric.weight;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore) : 0;
  };

  // Dynamic helper function to get status and action based on score and current score groups
  const getStatusAndAction = (score: number) => {
    const group = scoreGroups.find(sg => score >= sg.minScore && score <= sg.maxScore);
    return group ? { status: group.name, action: group.action } : { status: "Unknown", action: "Review required" };
  };

  const [merchants, setMerchants] = useState<Merchant[]>(initialState.merchants);

  // Data submission states
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualValue, setManualValue] = useState<string>("");
  const [dataSubmissions, setDataSubmissions] = useState<DataSubmission[]>(
    initialState.dataSubmissions.length > 0 ? initialState.dataSubmissions : [
      { id: "1", metricId: "1", metricName: "Ticket", month: "November", year: "2024", fileName: "tickets_nov.csv", submittedAt: "2024-11-15", status: "processed" },
      { id: "2", metricId: "2", metricName: "Adoption", month: "October", year: "2024", fileName: "adoption_oct.xlsx", submittedAt: "2024-11-01", status: "processed" }
    ]
  );

  // Initialize selectedColumns from localStorage
  useEffect(() => {
    setSelectedColumns(initialState.selectedColumns);
    setIsLoading(false);
  }, []);

  // Add sample merchants for demonstration if no merchants exist
  useEffect(() => {
    if (merchants.length === 0 && !hasStoredData()) {
      const sampleMerchants: Merchant[] = [
        {
          id: "1",
          name: "Acme Corp",
          accountId: "ACC001",
          month: "December",
          year: "2024",
          metricValues: {
            "1": [15, 12, 8, 5], // Ticket trending (improving)
            "2": 85, // Adoption
            "3": 150000, // GMV
            "4": 8 // Sentiment (manual input)
          },
          customFields: {
            "1": "Technology",
            "2": "50000",
            "3": "2024-01-15"
          },
          score: 0,
          status: "",
          action: ""
        },
        {
          id: "2", 
          name: "Beta Industries",
          accountId: "ACC002",
          month: "December",
          year: "2024",
          metricValues: {
            "1": [5, 8, 12, 18], // Ticket trending (declining)
            "2": 65, // Adoption
            "3": 75000, // GMV  
            "4": 6 // Sentiment (manual input)
          },
          customFields: {
            "1": "Retail",
            "2": "25000", 
            "3": "2024-03-01"
          },
          score: 0,
          status: "",
          action: ""
        },
        {
          id: "3",
          name: "Gamma Solutions", 
          accountId: "ACC003",
          month: "December",
          year: "2024",
          metricValues: {
            "1": [10, 10, 10, 10], // Ticket trending (stable)
            "2": 92, // Adoption
            "3": 200000, // GMV
            "4": 9 // Sentiment (manual input)
          },
          customFields: {
            "1": "Finance",
            "2": "75000",
            "3": "2023-11-20"
          },
          score: 0,
          status: "",
          action: ""
        }
      ];
      setMerchants(sampleMerchants);
    }
  }, []);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoading) {
      saveDataType('metrics', metrics);
    }
  }, [metrics, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('scoreGroups', scoreGroups);
    }
  }, [scoreGroups, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('customFields', customFields);
    }
  }, [customFields, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('merchants', merchants);
    }
  }, [merchants, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('selectedColumns', selectedColumns);
    }
  }, [selectedColumns, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('dataSubmissions', dataSubmissions);
      setStorageInfo(getStorageInfo());
    }
  }, [dataSubmissions, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveDataType('mappingProfiles', mappingProfiles);
    }
  }, [mappingProfiles, isLoading]);

  // Recalculate all merchant scores when metrics or score groups change
  useEffect(() => {
    setMerchants(currentMerchants => 
      currentMerchants.map(merchant => {
        const score = calculateHealthScore(merchant.metricValues);
        const { status, action } = getStatusAndAction(score);
        return { ...merchant, score, status, action };
      })
    );
  }, [metrics, scoreGroups]);

  // Only update selected columns when metrics change if user hasn't customized them
  useEffect(() => {
    const newColumns = ['customer'];
    
    // Add metric columns
    metrics.forEach(metric => {
      newColumns.push(`metric_${metric.id}`);
    });
    
    // Add standard columns
    newColumns.push('score', 'status', 'action');
    
    // Only update if we have default columns (not customized by user) or if it's the initial load
    const hasDefaultColumns = selectedColumns.length === 4 && 
      selectedColumns.includes('customer') && 
      selectedColumns.includes('score') && 
      selectedColumns.includes('status') && 
      selectedColumns.includes('action');
    
    if (hasDefaultColumns && !hasStoredData()) {
      setSelectedColumns(newColumns);
    }
  }, [metrics, customFields]);

  // Dynamic available columns based on current metrics and custom fields
  const availableColumns = [
    { id: 'customer', label: 'Customer Name', icon: <MdBusiness /> },
    ...metrics.map(metric => ({ 
      id: `metric_${metric.id}`, 
      label: metric.name, 
      icon: metric.name.toLowerCase().includes('ticket') ? <MdConfirmationNumber /> :
            metric.name.toLowerCase().includes('adoption') ? <MdTrendingUp /> :
            metric.name.toLowerCase().includes('gmv') ? <MdAttachMoney /> :
            metric.name.toLowerCase().includes('sentiment') ? <MdSentimentSatisfied /> : <FiBarChart />
    })),
    { id: 'score', label: 'Health Score', icon: <MdAssessment /> },
    { id: 'status', label: 'Status', icon: <MdCheckCircle /> },
    { id: 'action', label: 'Required Action', icon: <MdWarning /> },
    ...customFields.map(field => ({ id: `custom_${field.id}`, label: field.name, icon: <HiOutlineDocumentText /> }))
  ];

  // New form states
  const [newMetric, setNewMetric] = useState<{ name: string; weight: number; inputType: "manual" | "upload"; lowerBand: number; upperBand: number; lowerIsBetter: boolean; useTrending: boolean }>({ 
    name: "", 
    weight: 0, 
    inputType: "manual", 
    lowerBand: 0, 
    upperBand: 100,
    lowerIsBetter: false,
    useTrending: false
  });
  const [newField, setNewField] = useState<{ name: string; type: "text" | "number" | "date" | "select"; required: boolean; options: string[] }>({
    name: "",
    type: "text",
    required: false,
    options: []
  });
  const [newScoreGroup, setNewScoreGroup] = useState({ name: "", minScore: 0, maxScore: 0, action: "" });

  // Generate month and year options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = ["2024", "2025", "2026"];

  // Functions to add new items
  const addMetric = () => {
    if (newMetric.name && newMetric.weight > 0) {
      const newMetricId = Date.now().toString();
      setMetrics([...metrics, { 
        id: newMetricId, 
        name: newMetric.name, 
        weight: newMetric.weight, 
        inputType: newMetric.inputType,
        lowerBand: newMetric.lowerBand,
        upperBand: newMetric.upperBand,
        lowerIsBetter: newMetric.lowerIsBetter,
        useTrending: newMetric.useTrending
      }]);
      
      // Initialize new metric values for existing merchants (default to 0 or mid-range)
      setMerchants(currentMerchants => 
        currentMerchants.map(merchant => {
          const defaultValue = Math.floor((newMetric.lowerBand + newMetric.upperBand) / 2);
          const newMetricValues = { ...merchant.metricValues, [newMetricId]: defaultValue };
          const score = calculateHealthScore(newMetricValues);
          const { status, action } = getStatusAndAction(score);
          return { ...merchant, metricValues: newMetricValues, score, status, action };
        })
      );
      
      setNewMetric({ name: "", weight: 0, inputType: "manual", lowerBand: 0, upperBand: 100, lowerIsBetter: false, useTrending: false });
    }
  };

  const addCustomField = () => {
    if (newField.name) {
      const newFieldId = Date.now().toString();
      setCustomFields([...customFields, { 
        id: newFieldId, 
        ...newField
      }]);
      
      // Initialize new custom field values for existing merchants (empty by default)
      setMerchants(currentMerchants => 
        currentMerchants.map(merchant => {
          const newCustomFields = { ...merchant.customFields, [newFieldId]: "" };
          return { ...merchant, customFields: newCustomFields };
        })
      );
      
      setNewField({ name: "", type: "text", required: false, options: [] });
    }
  };

  const addScoreGroup = () => {
    if (newScoreGroup.name && newScoreGroup.action) {
      const color = getStatusColor(newScoreGroup.name);
      
      setScoreGroups([...scoreGroups, { 
        id: Date.now().toString(), 
        ...newScoreGroup,
        color
      }]);
      setNewScoreGroup({ name: "", minScore: 0, maxScore: 0, action: "" });
    }
  };

  // Helper function to determine color based on status name
  const getStatusColor = (statusName: string) => {
    const name = statusName.toLowerCase();
    if (name.includes("green") || name.includes("good") || name.includes("healthy") || name.includes("excellent")) {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (name.includes("yellow") || name.includes("warning") || name.includes("caution") || name.includes("moderate")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    } else if (name.includes("red") || name.includes("critical") || name.includes("danger") || name.includes("poor") || name.includes("bad")) {
      return "bg-red-100 text-red-800 border-red-200";
    } else if (name.includes("grey") || name.includes("gray") || name.includes("neutral") || name.includes("pending")) {
      return "bg-gray-100 text-gray-800 border-gray-200";
    } else if (name.includes("blue") || name.includes("info") || name.includes("information")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    } else if (name.includes("purple") || name.includes("premium") || name.includes("special")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    } else {
      return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Update colors when status names change
  useEffect(() => {
    setScoreGroups(currentGroups => 
      currentGroups.map(group => ({
        ...group,
        color: getStatusColor(group.name)
      }))
    );
  }, [scoreGroups.map(g => g.name + g.id).join(',')]);

  // Functions to delete items
  const deleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
    // Clean up metric values from all merchants
    setMerchants(currentMerchants => 
      currentMerchants.map(merchant => {
        const newMetricValues = { ...merchant.metricValues };
        delete newMetricValues[id];
        const score = calculateHealthScore(newMetricValues);
        const { status, action } = getStatusAndAction(score);
        return { ...merchant, metricValues: newMetricValues, score, status, action };
      })
    );
    // Remove from selected columns if present
    setSelectedColumns(cols => cols.filter(col => col !== `metric_${id}`));
  };

  const deleteCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
    // Clean up custom field values from all merchants
    setMerchants(currentMerchants => 
      currentMerchants.map(merchant => {
        const newCustomFields = { ...merchant.customFields };
        delete newCustomFields[id];
        return { ...merchant, customFields: newCustomFields };
      })
    );
    // Remove from selected columns if present
    setSelectedColumns(cols => cols.filter(col => col !== `custom_${id}`));
  };

  const deleteScoreGroup = (id: string) => {
    setScoreGroups(scoreGroups.filter(sg => sg.id !== id));
  };

  // Data submission functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const submitData = () => {
    if (!selectedMetric || !selectedMonth || !selectedYear) {
      alert("Please select metric, month, and year");
      return;
    }

    const selectedMetricData = metrics.find(m => m.id === selectedMetric);
    if (!selectedMetricData) return;

    if (selectedMetricData.inputType === "upload" && !uploadedFile) {
      alert("Please upload a file for this metric");
      return;
    }

    if (selectedMetricData.inputType === "manual" && !manualValue.trim()) {
      alert("Please enter a value for this metric");
      return;
    }

    const newSubmission: DataSubmission = {
      id: Date.now().toString(),
      metricId: selectedMetric,
      metricName: selectedMetricData.name,
      month: selectedMonth,
      year: selectedYear,
      fileName: selectedMetricData.inputType === "upload" ? uploadedFile?.name || "" : `Manual entry: ${manualValue}`,
      submittedAt: new Date().toISOString().split('T')[0],
      status: "pending"
    };

    setDataSubmissions([newSubmission, ...dataSubmissions]);
    
    // Reset form
    setSelectedMetric("");
    setSelectedMonth("");
    setSelectedYear("");
    setUploadedFile(null);
    setManualValue("");
    
    alert("Data submitted successfully!");
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "processed": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const calculateTotalWeight = () => metrics.reduce((sum, m) => sum + m.weight, 0);

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: <MdDashboard /> },
    { id: "field-creation", label: "Field Creation", icon: <MdAdd /> },
    { id: "metrics", label: "Metrics Config", icon: <MdSettings /> },
    { id: "score-rules", label: "Score Rules", icon: <MdStar /> },
    { id: "data-mapping", label: "Data Mapping", icon: <MdTableChart /> },
    { id: "customers", label: "Customers", icon: <MdPeople /> },
    { id: "settings", label: "Settings", icon: <MdSettings /> },
  ];

  // CSV Template Generation Function
  const generateCSVTemplate = () => {
    const headers = [];
    
    // Add standard headers based on selected columns
    if (selectedColumns.includes('customer')) {
      headers.push('Customer Name', 'Account ID');
    }
    
    // Add dynamic metric headers
    metrics.forEach(metric => {
      if (selectedColumns.includes(`metric_${metric.id}`)) {
        if (metric.useTrending) {
          // Trending metrics need 4 columns: M1, M2, M3, M4 (oldest to newest)
          headers.push(
            `${metric.name}_M1 (${metric.lowerBand}-${metric.upperBand})`,
            `${metric.name}_M2 (${metric.lowerBand}-${metric.upperBand})`,
            `${metric.name}_M3 (${metric.lowerBand}-${metric.upperBand})`,
            `${metric.name}_M4 (${metric.lowerBand}-${metric.upperBand})`
          );
        } else {
          // Single value metrics
          headers.push(`${metric.name} (${metric.lowerBand}-${metric.upperBand})`);
        }
      }
    });
    
    // Add custom field headers
    customFields.forEach(field => {
      if (selectedColumns.includes(`custom_${field.id}`)) {
        if (field.type === 'select' && field.options) {
          headers.push(`${field.name} (${field.options.join('|')})`);
        } else {
          headers.push(`${field.name} (${field.type})`);
        }
      }
    });

    // Create CSV content
    const csvContent = headers.join(',') + '\n';
    
    // Add example row
    const exampleRow = headers.map((header, index) => {
      if (header.includes('Customer Name')) return 'Example Customer';
      if (header.includes('Account ID')) return 'ACC001';
      
      // Dynamic metric examples - handle trending vs single
      const metric = metrics.find(m => header.includes(m.name.split(' ')[0])); // Handle M1, M2, etc
      if (metric) {
        // Generate sample values based on metric type
        let sampleValue;
        if (metric.name.toLowerCase().includes('ticket')) {
          sampleValue = Math.floor(Math.random() * (metric.upperBand - metric.lowerBand + 1)) + metric.lowerBand;
        } else if (metric.name.toLowerCase().includes('adoption')) {
          sampleValue = Math.floor(Math.random() * (metric.upperBand - metric.lowerBand + 1)) + metric.lowerBand;
        } else if (metric.name.toLowerCase().includes('gmv')) {
          sampleValue = Math.floor(Math.random() * (metric.upperBand - metric.lowerBand + 1)) + metric.lowerBand;
        } else if (metric.name.toLowerCase().includes('sentiment')) {
          sampleValue = Math.floor(Math.random() * (metric.upperBand - metric.lowerBand + 1)) + metric.lowerBand;
        } else {
          sampleValue = Math.floor((metric.lowerBand + metric.upperBand) / 2);
        }
        
        // For trending, vary the sample values slightly to show progression
        if (metric.useTrending) {
          if (header.includes('_M1')) return (sampleValue - 2).toString();
          if (header.includes('_M2')) return (sampleValue - 1).toString();
          if (header.includes('_M3')) return sampleValue.toString();
          if (header.includes('_M4')) return (sampleValue + 1).toString();
        }
        
        return sampleValue.toString();
      }
      
      if (header.includes('(text)')) return 'Sample Text';
      if (header.includes('(number)')) return '100';
      if (header.includes('(date)')) return '2024-01-15';
      if (header.includes('(select)')) {
        const options = header.match(/\((.*)\)/)?.[1]?.split('|') || [];
        return options[0] || 'Option1';
      }
      return 'Sample Data';
    });
    
    const finalContent = csvContent + exampleRow.join(',');
    
    // Create and download file
    const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_data_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Upload Function
  const [uploadedCSV, setUploadedCSV] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedCSV(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).filter(line => line.trim()).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = { 
            id: `uploaded_${index}`,
            metricValues: {},
            customFields: {},
            month: "December", // Default month since period is not in CSV
            year: "2024"       // Default year since period is not in CSV
          };
          
          headers.forEach((header, i) => {
            const value = values[i] || '';
            
            // Map headers to merchant properties
            if (header.includes('Customer Name')) row.name = value;
            if (header.includes('Account ID')) row.accountId = value;
            
            // Handle dynamic metrics
            const metric = metrics.find(m => header.includes(m.name));
            if (metric) {
              if (metric.useTrending) {
                // Initialize trending array if not exists
                if (!row.metricValues[metric.id]) {
                  row.metricValues[metric.id] = [0, 0, 0, 0]; // [M1, M2, M3, M4]
                }
                
                // Parse trending data
                const trendingArray = row.metricValues[metric.id] as number[];
                if (header.includes('_M1')) trendingArray[0] = parseFloat(value) || 0;
                if (header.includes('_M2')) trendingArray[1] = parseFloat(value) || 0;
                if (header.includes('_M3')) trendingArray[2] = parseFloat(value) || 0;
                if (header.includes('_M4')) trendingArray[3] = parseFloat(value) || 0;
                
                row.metricValues[metric.id] = trendingArray;
              } else {
                // Single value metric
                row.metricValues[metric.id] = parseFloat(value) || 0;
              }
            }
            
            // Handle custom fields
            const customField = customFields.find(f => header.includes(f.name));
            if (customField) {
              row.customFields[customField.id] = value;
            }
          });
          
          // Calculate score and status for new rows
          if (Object.keys(row.metricValues).length > 0) {
            row.score = calculateHealthScore(row.metricValues);
            const statusAction = getStatusAndAction(row.score);
            row.status = statusAction.status;
            row.action = statusAction.action;
          }
          
          return row;
        });
        
        setCsvData(data);
      };
      
      reader.readAsText(file);
    }
  };

  const importCSVData = () => {
    if (csvData.length > 0) {
      setMerchants(currentMerchants => {
        const updatedMerchants = [...currentMerchants];
        
        csvData.forEach(newMerchant => {
          // Find existing merchant with same name (case-insensitive)
          const existingIndex = updatedMerchants.findIndex(
            existing => existing.name.toLowerCase() === newMerchant.name.toLowerCase()
          );
          
          if (existingIndex !== -1) {
            // Overwrite existing record
            updatedMerchants[existingIndex] = newMerchant;
          } else {
            // Add new record
            updatedMerchants.push(newMerchant);
          }
        });
        
        return updatedMerchants;
      });
      
      const overwrittenCount = csvData.filter(newMerchant => 
        merchants.some(existing => existing.name.toLowerCase() === newMerchant.name.toLowerCase())
      ).length;
      const newCount = csvData.length - overwrittenCount;
      
      setCsvData([]);
      setUploadedCSV(null);
      setShowCSVUploader(false);
      
      let message = `Successfully imported ${csvData.length} customer records!`;
      if (overwrittenCount > 0) {
        message += ` (${overwrittenCount} existing records updated, ${newCount} new records added)`;
      }
      
      alert(message);
    }
  };

  // Functions to update merchant data
  const updateMerchantMetricValue = (merchantId: string, metricId: string, newValue: number) => {
    setMerchants(currentMerchants => 
      currentMerchants.map(merchant => {
        if (merchant.id === merchantId) {
          const newMetricValues = { ...merchant.metricValues, [metricId]: newValue };
          const score = calculateHealthScore(newMetricValues);
          const { status, action } = getStatusAndAction(score);
          return { ...merchant, metricValues: newMetricValues, score, status, action };
        }
        return merchant;
      })
    );
  };

  // Column reordering functions
  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...selectedColumns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    setSelectedColumns(newColumns);
    
    // Force save immediately and show confirmation
    saveDataType('selectedColumns', newColumns);
    console.log('Saved column order:', newColumns);
    setSaveStatus('Column order saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const moveColumnUp = (columnId: string) => {
    const currentIndex = selectedColumns.indexOf(columnId);
    if (currentIndex > 0) {
      moveColumn(currentIndex, currentIndex - 1);
    }
  };

  const moveColumnDown = (columnId: string) => {
    const currentIndex = selectedColumns.indexOf(columnId);
    if (currentIndex < selectedColumns.length - 1) {
      moveColumn(currentIndex, currentIndex + 1);
    }
  };

  // Drag and Drop functionality for column reordering
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumnIndex !== null && draggedColumnIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the container, not moving between children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedColumnIndex !== null && draggedColumnIndex !== dropIndex) {
      moveColumn(draggedColumnIndex, dropIndex);
    }
    setDraggedColumnIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedColumnIndex(null);
    setDragOverIndex(null);
  };

  // Local Storage Management Functions
  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearLocalStorage();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    try {
      const dataString = exportData();
      const blob = new Blob([dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-score-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data: ' + error);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (importData(content)) {
            alert('Data imported successfully! The page will reload to apply changes.');
            window.location.reload();
          } else {
            alert('Failed to import data. Please check the file format.');
          }
        } catch (error) {
          alert('Error importing data: ' + error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Enhanced save function for column customizer
  const handleSaveColumnSettings = () => {
    // Force save to localStorage
    const saved = saveDataType('selectedColumns', selectedColumns);
    console.log('Force save result:', saved, 'Columns:', selectedColumns);
    setStorageInfo(getStorageInfo());
    setSaveStatus('Column settings saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
    setShowColumnCustomizer(false);
  };

  // Enhanced column selection handler
  const handleColumnToggle = (columnId: string, checked: boolean) => {
    const newColumns = checked 
      ? [...selectedColumns, columnId]
      : selectedColumns.filter(col => col !== columnId);
    
    setSelectedColumns(newColumns);
    
    // Force save immediately
    saveDataType('selectedColumns', newColumns);
    console.log('Saved column selection:', newColumns);
    setSaveStatus('Column selection saved!');
    setTimeout(() => setSaveStatus(''), 1500);
  };

  // Field Mapping Functions
  const createMappingProfile = (name: string, description: string, source: string) => {
    const newProfile: MappingProfile = {
      id: Date.now().toString(),
      name,
      description,
      source,
      createdAt: new Date().toISOString(),
      lastUsed: '',
      fieldMappings: [],
      settings: {
        dateFormat: 'YYYY-MM-DD',
        numberFormat: 'decimal',
        skipFirstRow: true,
        delimiter: ','
      }
    };
    
    setMappingProfiles([...mappingProfiles, newProfile]);
    setSaveStatus(`Mapping profile "${name}" created successfully!`);
    setTimeout(() => setSaveStatus(''), 3000);
    return newProfile.id;
  };

  const deleteMappingProfile = (profileId: string) => {
    setMappingProfiles(mappingProfiles.filter(p => p.id !== profileId));
    if (selectedProfile === profileId) {
      setSelectedProfile('');
    }
    setSaveStatus('Mapping profile deleted successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const detectFieldMappings = (csvHeaders: string[]): FieldMapping[] => {
    const suggestions: FieldMapping[] = [];
    const targetFields = [
      'customer', 'score', 'status', 'action',
      ...metrics.map(m => `metric_${m.id}`),
      ...customFields.map(f => `custom_${f.id}`)
    ];

    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      let suggestion: FieldMapping | null = null;

      // Smart field detection
      if (lowerHeader.includes('customer') || lowerHeader.includes('client') || lowerHeader.includes('merchant')) {
        suggestion = { csvColumn: header, appField: 'customer', isRequired: true };
      } else if (lowerHeader.includes('score') || lowerHeader.includes('rating')) {
        suggestion = { csvColumn: header, appField: 'score', isRequired: false };
      } else if (lowerHeader.includes('ticket') || lowerHeader.includes('support')) {
        const ticketMetric = metrics.find(m => m.name.toLowerCase().includes('ticket'));
        if (ticketMetric) {
          suggestion = { csvColumn: header, appField: `metric_${ticketMetric.id}`, isRequired: false };
        }
      } else if (lowerHeader.includes('adoption') || lowerHeader.includes('usage')) {
        const adoptionMetric = metrics.find(m => m.name.toLowerCase().includes('adoption'));
        if (adoptionMetric) {
          suggestion = { csvColumn: header, appField: `metric_${adoptionMetric.id}`, isRequired: false };
        }
      } else if (lowerHeader.includes('gmv') || lowerHeader.includes('revenue') || lowerHeader.includes('sales')) {
        const gmvMetric = metrics.find(m => m.name.toLowerCase().includes('gmv'));
        if (gmvMetric) {
          suggestion = { csvColumn: header, appField: `metric_${gmvMetric.id}`, isRequired: false };
        }
      } else if (lowerHeader.includes('sentiment') || lowerHeader.includes('satisfaction')) {
        const sentimentMetric = metrics.find(m => m.name.toLowerCase().includes('sentiment'));
        if (sentimentMetric) {
          suggestion = { csvColumn: header, appField: `metric_${sentimentMetric.id}`, isRequired: false };
        }
      }

      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    return suggestions;
  };

  const analyzeCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const previewData = lines.slice(1, 6).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );
        
        setCsvHeaders(headers);
        setCsvPreviewData(previewData);
        setShowMappingWizard(true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MdAssessment className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Health Score</h1>
              <p className="text-sm">Customer Success Platform</p>
            </div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="sidebar-nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {currentPage === "dashboard" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
              <p className="text-slate-600 mt-1">Monitor customer health metrics and performance indicators</p>
            </div>
            
            <div className="content-body">
              {/* Enhanced Summary Cards */}
              <div className="summary-card-grid">
                <div className="summary-card healthy">
                  <div className="summary-card-icon healthy">
                    <MdCheckCircle />
                  </div>
                  <div className="summary-card-value">{merchants.filter(m => m.status === "Green").length}</div>
                  <div className="summary-card-label">Healthy Customers</div>
                </div>
                
                <div className="summary-card warning">
                  <div className="summary-card-icon warning">
                    <MdWarning />
                  </div>
                  <div className="summary-card-value">{merchants.filter(m => m.status === "Yellow").length}</div>
                  <div className="summary-card-label">Need Follow-up</div>
                </div>
                
                <div className="summary-card critical">
                  <div className="summary-card-icon critical">
                    <MdError />
                  </div>
                  <div className="summary-card-value">{merchants.filter(m => m.status === "Red").length}</div>
                  <div className="summary-card-label">Urgent Action Required</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="professional-card">
                <div className="card-header-professional">
                  <h3 className="text-lg font-semibold">System Overview</h3>
                </div>
                <div className="card-content-professional">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700">{merchants.length}</div>
                      <div className="text-sm text-slate-500">Total Customers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700">{metrics.length}</div>
                      <div className="text-sm text-slate-500">Active Metrics</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700">{customFields.length}</div>
                      <div className="text-sm text-slate-500">Custom Fields</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-700">{merchants.length > 0 ? Math.round(merchants.reduce((sum, m) => sum + m.score, 0) / merchants.length) : 0}</div>
                      <div className="text-sm text-slate-500">Average Score</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "field-creation" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Field Creation</h1>
              <p className="text-slate-600 mt-1">Create and manage custom fields for customer data</p>
            </div>
            
            <div className="content-body">
              <div className="professional-card">
                <div className="card-header-professional">
                  <div className="flex items-center gap-3">
                    <MdAdd className="text-xl text-blue-600" />
                    <h3 className="text-lg font-semibold">Custom Fields Configuration</h3>
                  </div>
                </div>
                <div className="card-content-professional space-y-8">
                  <div className="grid gap-6">
                    <div className="form-grid form-grid-5 form-grid-header">
                      <div>Field Name</div>
                      <div>Type</div>
                      <div>Required</div>
                      <div>Options</div>
                      <div>Actions</div>
                    </div>
                    
                    {customFields.map((field) => (
                      <div key={field.id} className="form-grid form-grid-5 form-grid-row">
                        <div className="form-field">
                          <Input 
                            value={field.name} 
                            onChange={(e) => setCustomFields(customFields.map(f => 
                              f.id === field.id ? {...f, name: e.target.value} : f
                            ))}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Select 
                            value={field.type}
                            onValueChange={(value) => 
                              setCustomFields(customFields.map(f => 
                                f.id === field.id ? {...f, type: value as "text" | "number" | "date" | "select"} : f
                              ))
                            }
                          >
                            <SelectTrigger className="form-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => setCustomFields(customFields.map(f => 
                              f.id === field.id ? {...f, required: e.target.checked} : f
                            ))}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                        <div className="form-field">
                          <Input 
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => setCustomFields(customFields.map(f => 
                              f.id === field.id ? {...f, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} : f
                            ))}
                            placeholder={field.type === "select" ? "Option1, Option2, Option3" : "N/A"}
                            disabled={field.type !== "select"}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteCustomField(field.id)}
                            className="bg-red-500 hover:bg-red-600 rounded-lg w-full"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new field form */}
                    <div className="form-grid form-grid-5 form-grid-add">
                      <div className="form-field">
                        <Input 
                          placeholder="Field name"
                          value={newField.name}
                          onChange={(e) => setNewField({...newField, name: e.target.value})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Select 
                          value={newField.type}
                          onValueChange={(value) => setNewField({...newField, type: value as "text" | "number" | "date" | "select"})}
                        >
                          <SelectTrigger className="form-control border-blue-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={newField.required}
                          onChange={(e) => setNewField({...newField, required: e.target.checked})}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="form-field">
                        <Input 
                          placeholder={newField.type === "select" ? "Option1, Option2, Option3" : "N/A"}
                          value={newField.options.join(', ')}
                          onChange={(e) => setNewField({...newField, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                          disabled={newField.type !== "select"}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Button onClick={addCustomField} className="btn-primary w-full">
                          Add Field
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "metrics" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Metrics Configuration</h1>
              <p className="text-slate-600 mt-1">Configure health score metrics and performance bands</p>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <MdTrendingUp className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Trending Analysis:</strong> Enable trending for metrics that need 4-month analysis. 
                    <strong> Color-coded scoring:</strong> 🟢 <strong>Up</strong> (100pts, Best), 🟡 <strong>Equal</strong> (75pts, Good), 
                    🔴 <strong>Down</strong> (25pts, Worst), ⚫ <strong>Mixed</strong> (50pts, Neutral). 
                    <strong> Note:</strong> Trending metrics ignore Lower/Upper bands and use directional scoring instead. 
                    Requires M1, M2, M3, M4 data in CSV imports.
                  </span>
                </p>
              </div>
            </div>
            
            <div className="content-body">
              <div className="professional-card">
                <div className="card-header-professional">
                  <div className="flex items-center gap-3">
                    <MdSettings className="text-xl text-blue-600" />
                    <h3 className="text-lg font-semibold">Metrics Configuration</h3>
                  </div>
                </div>
                <div className="card-content-professional space-y-8">
                  <div className="grid gap-6">
                    <div className="form-grid form-grid-8 form-grid-header">
                      <div>Metric Name</div>
                      <div>Weight (%)</div>
                      <div>Input Type</div>
                      <div>Lower Band</div>
                      <div>Upper Band</div>
                      <div>Lower is Better</div>
                      <div>Use Trending</div>
                      <div>Actions</div>
                    </div>
                    
                    {metrics.map((metric) => (
                      <div key={metric.id} className="form-grid form-grid-8 form-grid-row">
                        <div className="form-field">
                          <Input 
                            value={metric.name} 
                            onChange={(e) => setMetrics(metrics.map(m => 
                              m.id === metric.id ? {...m, name: e.target.value} : m
                            ))}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Input 
                            type="number" 
                            value={metric.weight} 
                            onChange={(e) => setMetrics(metrics.map(m => 
                              m.id === metric.id ? {...m, weight: parseInt(e.target.value) || 0} : m
                            ))}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Select 
                            value={metric.inputType}
                            onValueChange={(value) => 
                              setMetrics(metrics.map(m => 
                                m.id === metric.id ? {...m, inputType: value as "manual" | "upload"} : m
                              ))
                            }
                          >
                            <SelectTrigger className="form-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual Entry</SelectItem>
                              <SelectItem value="upload">File Upload</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Lower Band - Hidden for trending metrics */}
                        <div className="form-field">
                          {metric.useTrending ? (
                            <div className="trending-status primary">
                              Trending<br/>Scoring
                            </div>
                          ) : (
                            <Input 
                              type="number" 
                              value={metric.lowerBand} 
                              onChange={(e) => setMetrics(metrics.map(m => 
                                m.id === metric.id ? {...m, lowerBand: parseInt(e.target.value) || 0} : m
                              ))}
                              placeholder="Lower threshold"
                              className="form-control"
                            />
                          )}
                        </div>
                        
                        {/* Upper Band - Hidden for trending metrics */}
                        <div className="form-field">
                          {metric.useTrending ? (
                            <div className="trending-status">
                              Not Used
                            </div>
                          ) : (
                            <Input 
                              type="number" 
                              value={metric.upperBand} 
                              onChange={(e) => setMetrics(metrics.map(m => 
                                m.id === metric.id ? {...m, upperBand: parseInt(e.target.value) || 0} : m
                              ))}
                              placeholder="Upper threshold"
                              className="form-control"
                            />
                          )}
                        </div>
                        
                        {/* Lower is Better - Hidden for trending metrics */}
                        <div className="form-field">
                          {metric.useTrending ? (
                            <div className="trending-status">
                              Direction<br/>Based
                            </div>
                          ) : (
                            <Select 
                              value={metric.lowerIsBetter ? "yes" : "no"}
                              onValueChange={(value) => 
                                setMetrics(metrics.map(m => 
                                  m.id === metric.id ? {...m, lowerIsBetter: value === "yes"} : m
                                ))
                              }
                            >
                              <SelectTrigger className="form-control">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        
                        <div className="form-field">
                          <Select 
                            value={metric.useTrending ? "yes" : "no"}
                            onValueChange={(value) => 
                              setMetrics(metrics.map(m => 
                                m.id === metric.id ? {...m, useTrending: value === "yes"} : m
                              ))
                            }
                          >
                            <SelectTrigger className="form-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-field">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteMetric(metric.id)}
                            className="bg-red-500 hover:bg-red-600 rounded-lg w-full"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new metric form */}
                    <div className="form-grid form-grid-8 form-grid-add">
                      <div className="form-field">
                        <Input 
                          placeholder="New metric name"
                          value={newMetric.name}
                          onChange={(e) => setNewMetric({...newMetric, name: e.target.value})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Input 
                          type="number" 
                          placeholder="Weight %"
                          value={newMetric.weight || ""}
                          onChange={(e) => setNewMetric({...newMetric, weight: parseInt(e.target.value) || 0})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Select 
                          value={newMetric.inputType}
                          onValueChange={(value) => setNewMetric({...newMetric, inputType: value as "manual" | "upload"})}
                        >
                          <SelectTrigger className="form-control border-blue-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual Entry</SelectItem>
                            <SelectItem value="upload">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Lower Band - Hidden for trending metrics */}
                      <div className="form-field">
                        {newMetric.useTrending ? (
                          <div className="trending-status primary">
                            Trending<br/>Scoring
                          </div>
                        ) : (
                          <Input 
                            type="number" 
                            placeholder="Lower band"
                            value={newMetric.lowerBand || ""}
                            onChange={(e) => setNewMetric({...newMetric, lowerBand: parseInt(e.target.value) || 0})}
                            className="form-control border-blue-300"
                          />
                        )}
                      </div>
                      
                      {/* Upper Band - Hidden for trending metrics */}
                      <div className="form-field">
                        {newMetric.useTrending ? (
                          <div className="trending-status">
                            Not Used
                          </div>
                        ) : (
                          <Input 
                            type="number" 
                            placeholder="Upper band"
                            value={newMetric.upperBand || ""}
                            onChange={(e) => setNewMetric({...newMetric, upperBand: parseInt(e.target.value) || 0})}
                            className="form-control border-blue-300"
                          />
                        )}
                      </div>
                      
                      {/* Lower is Better - Hidden for trending metrics */}
                      <div className="form-field">
                        {newMetric.useTrending ? (
                          <div className="trending-status">
                            Direction<br/>Based
                          </div>
                        ) : (
                          <Select 
                            value={newMetric.lowerIsBetter ? "yes" : "no"}
                            onValueChange={(value) => setNewMetric({...newMetric, lowerIsBetter: value === "yes"})}
                          >
                            <SelectTrigger className="form-control border-blue-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <div className="form-field">
                        <Select 
                          value={newMetric.useTrending ? "yes" : "no"}
                          onValueChange={(value) => setNewMetric({...newMetric, useTrending: value === "yes"})}
                        >
                          <SelectTrigger className="form-control border-blue-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="form-field">
                        <Button onClick={addMetric} className="btn-primary w-full">
                          Add Metric
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <div className="flex-1 p-4 rounded-lg border border-blue-200 bg-blue-50">
                      <p className="text-sm text-blue-800">
                        <strong>Total Weight:</strong> {calculateTotalWeight()}% 
                        {calculateTotalWeight() !== 100 && (
                          <span className="text-red-600 ml-2">⚠️ Weights should total 100%</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex-1 p-4 rounded-lg border border-green-200 bg-green-50">
                      <h4 className="font-semibold text-green-800 mb-2">Metric Evaluation Guide</h4>
                      <p className="text-sm text-green-700 mb-2">
                        <strong>Standard Metrics:</strong>
                      </p>
                      <ul className="text-sm text-green-700 space-y-1 list-disc list-inside mb-3">
                        <li><strong>Lower is Better (Yes):</strong> "Healthy" when value ≤ upperBand</li>
                        <li><strong>Higher is Better (No):</strong> "Healthy" when value ≥ lowerBand</li>
                        <li><strong>Examples:</strong> Response time, downtime = "Yes" | Satisfaction, success rate = "No"</li>
                      </ul>
                      <p className="text-sm text-green-700 mb-2">
                        <strong>Trending Metrics:</strong>
                      </p>
                      <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                        <li><strong>🟢 Up Trend:</strong> Score 100 (M1 &lt; M2 &lt; M3 &lt; M4) - Best Performance</li>
                        <li><strong>🟡 Stable:</strong> Score 75 (M1 = M2 = M3 = M4) - Good Performance</li>
                        <li><strong>🔴 Down Trend:</strong> Score 25 (M1 &gt; M2 &gt; M3 &gt; M4) - Worst Performance</li>
                        <li><strong>⚫ Mixed:</strong> Score 50 (All other patterns) - Neutral Performance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "score-rules" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Score Rules Configuration</h1>
              <p className="text-slate-600 mt-1">Define score ranges and required actions for customer health management</p>
            </div>
            
            <div className="content-body">
              <div className="professional-card">
                <div className="card-header-professional">
                  <div className="flex items-center gap-3">
                    <MdStar className="text-xl text-blue-600" />
                    <h3 className="text-lg font-semibold">Scorecard & Action Configuration</h3>
                  </div>
                </div>
                <div className="card-content-professional space-y-8">
                  <div className="grid gap-6">
                    <div className="form-grid form-grid-5 form-grid-header">
                      <div>Status Name</div>
                      <div>Min Score</div>
                      <div>Max Score</div>
                      <div>Required Action</div>
                      <div>Actions</div>
                    </div>
                    
                    {scoreGroups.map((group) => (
                      <div key={group.id} className="form-grid form-grid-5 form-grid-row">
                        <div className="form-field">
                          <div className="flex items-center gap-2">
                            <Input 
                              value={group.name} 
                              onChange={(e) => setScoreGroups(scoreGroups.map(sg => 
                                sg.id === group.id ? {
                                  ...sg, 
                                  name: e.target.value,
                                  color: getStatusColor(e.target.value)
                                } : sg
                              ))}
                              className="form-control"
                              placeholder="Status name"
                            />
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${group.color} ml-2`}>
                              Preview
                            </span>
                          </div>
                        </div>
                        <div className="form-field">
                          <Input 
                            type="number" 
                            value={group.minScore} 
                            onChange={(e) => setScoreGroups(scoreGroups.map(sg => 
                              sg.id === group.id ? {...sg, minScore: parseInt(e.target.value) || 0} : sg
                            ))}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Input 
                            type="number" 
                            value={group.maxScore} 
                            onChange={(e) => setScoreGroups(scoreGroups.map(sg => 
                              sg.id === group.id ? {...sg, maxScore: parseInt(e.target.value) || 0} : sg
                            ))}
                            className="form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Textarea 
                            value={group.action} 
                            onChange={(e) => setScoreGroups(scoreGroups.map(sg => 
                              sg.id === group.id ? {...sg, action: e.target.value} : sg
                            ))}
                            className="min-h-[60px] form-control"
                          />
                        </div>
                        <div className="form-field">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteScoreGroup(group.id)}
                            className="bg-red-500 hover:bg-red-600 rounded-lg w-full"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new score group form */}
                    <div className="form-grid form-grid-5 form-grid-add">
                      <div className="form-field">
                        <Input 
                          placeholder="Status name"
                          value={newScoreGroup.name}
                          onChange={(e) => setNewScoreGroup({...newScoreGroup, name: e.target.value})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Input 
                          type="number" 
                          placeholder="Min score"
                          value={newScoreGroup.minScore || ""}
                          onChange={(e) => setNewScoreGroup({...newScoreGroup, minScore: parseInt(e.target.value) || 0})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Input 
                          type="number" 
                          placeholder="Max score"
                          value={newScoreGroup.maxScore || ""}
                          onChange={(e) => setNewScoreGroup({...newScoreGroup, maxScore: parseInt(e.target.value) || 0})}
                          className="form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Textarea 
                          placeholder="Required action"
                          value={newScoreGroup.action}
                          onChange={(e) => setNewScoreGroup({...newScoreGroup, action: e.target.value})}
                          className="min-h-[60px] form-control border-blue-300"
                        />
                      </div>
                      <div className="form-field">
                        <Button onClick={addScoreGroup} className="btn-primary w-full">
                          Add Group
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "data-mapping" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">CSV Data Mapping</h1>
              <p className="text-slate-600 mt-1">Create and manage field mapping profiles for automated CSV imports</p>
            </div>
            
            <div className="content-body space-y-6">
              {/* Mapping Profiles Management */}
              <div className="professional-card">
                <div className="card-header-professional">
                  <div className="flex items-center gap-3">
                    <MdTableChart className="text-xl text-blue-600" />
                    <h3 className="text-lg font-semibold">Mapping Profiles</h3>
                  </div>
                </div>
                <div className="card-content-professional">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {mappingProfiles.length === 0 ? (
                      <div className="col-span-3 text-center py-12 text-gray-500">
                        <MdTableChart className="mx-auto text-6xl mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold mb-2">No Mapping Profiles Yet</h3>
                        <p className="mb-4">Create your first mapping profile to streamline CSV imports</p>
                        <Button 
                          onClick={() => {
                            const name = prompt('Profile Name (e.g., "Intercom Export"):');
                            if (name) {
                              const description = prompt('Description:') || '';
                              const source = prompt('Data Source (e.g., "Intercom", "StoreHub"):') || 'Unknown';
                              createMappingProfile(name, description, source);
                            }
                          }}
                          className="btn-primary"
                        >
                          <MdAdd className="mr-2" />
                          Create First Profile
                        </Button>
                      </div>
                    ) : (
                      <>
                        {mappingProfiles.map((profile) => (
                          <div key={profile.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900">{profile.name}</h4>
                                <p className="text-sm text-gray-600">{profile.source}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedProfile(profile.id)}
                                  className={selectedProfile === profile.id ? "btn-primary" : "btn-secondary"}
                                >
                                  {selectedProfile === profile.id ? "Selected" : "Select"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMappingProfile(profile.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{profile.description}</p>
                            <div className="text-xs text-gray-500">
                              <div>Mappings: {profile.fieldMappings.length}</div>
                              <div>Created: {new Date(profile.createdAt).toLocaleDateString()}</div>
                              {profile.lastUsed && <div>Last Used: {new Date(profile.lastUsed).toLocaleDateString()}</div>}
                            </div>
                          </div>
                        ))}
                        
                        {/* Add New Profile Button */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center hover:border-blue-400 transition-colors cursor-pointer"
                             onClick={() => {
                               const name = prompt('Profile Name (e.g., "Intercom Export"):');
                               if (name) {
                                 const description = prompt('Description:') || '';
                                 const source = prompt('Data Source (e.g., "Intercom", "StoreHub"):') || 'Unknown';
                                 createMappingProfile(name, description, source);
                               }
                             }}>
                          <div className="text-center">
                            <MdAdd className="mx-auto text-2xl text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Add New Profile</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* CSV Upload and Analysis */}
              <div className="professional-card">
                <div className="card-header-professional">
                  <div className="flex items-center gap-3">
                    <MdCloudUpload className="text-xl text-green-600" />
                    <h3 className="text-lg font-semibold">Upload & Map CSV</h3>
                  </div>
                </div>
                <div className="card-content-professional">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            analyzeCsvFile(file);
                          }
                        }}
                        className="hidden"
                        id="csv-analyzer"
                      />
                      <label htmlFor="csv-analyzer" className="cursor-pointer">
                        <MdCloudUpload className="mx-auto text-6xl text-blue-500 mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV for Analysis</h4>
                        <p className="text-gray-600 mb-4">
                          Upload your CSV file to automatically detect field mappings
                        </p>
                        <Button className="btn-primary">
                          Choose CSV File
                        </Button>
                      </label>
                    </div>
                    
                    {csvHeaders.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-semibold text-blue-900 mb-2">CSV Analysis Complete</h5>
                        <p className="text-blue-800 text-sm mb-3">
                          Found {csvHeaders.length} columns. Review the suggested field mappings below.
                        </p>
                        <div className="flex items-center gap-2">
                          <MdCheckCircle className="text-green-600" />
                          <span className="text-sm text-green-800">Ready for field mapping</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Field Mapping Wizard Modal */}
        {showMappingWizard && csvHeaders && csvHeaders.length > 0 && metrics && customFields && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">CSV Field Mapping Wizard</h2>
                    <p className="text-gray-600 mt-1">Map your CSV columns to application fields</p>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowMappingWizard(false);
                      setCsvHeaders([]);
                      setCsvPreviewData([]);
                      setFieldMappings({});
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              <div className="flex h-[70vh]">
                {/* CSV Preview Panel */}
                <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-4">CSV Preview</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Columns Found:</span> {csvHeaders?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Sample Rows:</span> {csvPreviewData?.length || 0}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 border rounded-lg">
                      <h3 className="font-medium text-lg mb-3">CSV Preview</h3>
                      
                      {/* CSV Headers */}
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        {Array.isArray(csvHeaders) && csvHeaders.slice(0, 12).map((header, index) => (
                          <div key={`header-${index}`} className="font-semibold text-xs bg-blue-100 p-2 rounded">
                            {header && typeof header === 'string' ? header : `Column ${index + 1}`}
                          </div>
                        ))}
                      </div>
                      
                      {/* Sample Data Rows */}
                      {Array.isArray(csvPreviewData) && csvPreviewData.slice(0, 3).map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="grid grid-cols-12 gap-2 mb-1">
                          {Array.isArray(row) && row.slice(0, 12).map((cell, cellIndex) => (
                            <div key={`cell-${rowIndex}-${cellIndex}`} className="text-xs p-2 bg-white border rounded truncate">
                              {cell !== null && cell !== undefined && typeof cell !== 'object' ? String(cell) : ''}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Field Mapping Panel */}
                <div className="w-1/2 p-6 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-4">Field Mapping</h3>
                  
                  {/* Profile Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Use Mapping Profile (Optional)
                    </label>
                    <ErrorBoundary>
                      <Select 
                        value={selectedProfile || ""} 
                        onValueChange={(value) => {
                          try {
                            setSelectedProfile(value);
                          } catch (error) {
                            console.error('Profile selection error:', error);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a profile or map manually" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Manual Mapping</SelectItem>
                          {Array.isArray(mappingProfiles) && mappingProfiles.length > 0 && mappingProfiles
                            .filter(profile => profile && typeof profile === 'object' && profile.id && profile.name && profile.source)
                            .map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name} ({profile.source})
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </ErrorBoundary>
                  </div>

                  {/* Smart Suggestions */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Smart Mapping Suggestions</h4>
                    <Button 
                      onClick={() => {
                        try {
                          if (Array.isArray(csvHeaders) && csvHeaders.length > 0 && typeof detectFieldMappings === 'function') {
                            const suggestions = detectFieldMappings(csvHeaders);
                            if (Array.isArray(suggestions) && suggestions.length > 0) {
                              // Apply suggestions to fieldMappings
                              const newMappings: Record<string, string> = {};
                              suggestions.forEach(suggestion => {
                                if (suggestion && suggestion.csvColumn && suggestion.appField) {
                                  newMappings[suggestion.csvColumn] = suggestion.appField;
                                }
                              });
                              setFieldMappings(prev => ({ ...(prev || {}), ...newMappings }));
                              setSaveStatus(`Found ${suggestions.length} automatic suggestions!`);
                            } else {
                              setSaveStatus('No automatic suggestions found.');
                            }
                          } else {
                            setSaveStatus('Auto-detection not available.');
                          }
                          setTimeout(() => setSaveStatus(''), 3000);
                        } catch (error) {
                          console.error('Auto-detection error:', error);
                          setSaveStatus('Error during auto-detection.');
                          setTimeout(() => setSaveStatus(''), 3000);
                        }
                      }}
                      className="btn-primary btn-sm"
                    >
                      <MdAutoAwesome className="mr-2" />
                      Auto-Detect Fields
                    </Button>
                    <p className="text-sm text-blue-800 mt-2">
                      We'll analyze your column names and suggest the best field mappings
                    </p>
                  </div>

                  {/* Manual Field Mapping */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Map CSV Columns to App Fields</h4>
                    {Array.isArray(csvHeaders) && csvHeaders.length > 0 && csvHeaders.map((header, index) => (
                      <div key={`${header}-${index}`} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{header || `Column ${index + 1}`}</div>
                          <div className="text-xs text-gray-500">
                            Sample: {
                              Array.isArray(csvPreviewData) && csvPreviewData[0] && Array.isArray(csvPreviewData[0]) 
                                ? (csvPreviewData[0][index] || 'No data')
                                : 'No data'
                            }
                          </div>
                        </div>
                        <div className="w-8 text-center text-gray-400">→</div>
                        <div className="flex-1">
                          <ErrorBoundary>
                            <Select
                              value={(fieldMappings && fieldMappings[header]) || ""}
                              onValueChange={(value) => {
                                try {
                                  setFieldMappings(prev => ({
                                    ...(prev || {}),
                                    [header]: value
                                  }));
                                } catch (error) {
                                  console.error('Field mapping error:', error);
                                }
                              }}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Choose field..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Skip this column</SelectItem>
                                <SelectItem value="customer">Customer Name</SelectItem>
                                <SelectItem value="score">Health Score</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                {Array.isArray(metrics) && metrics.length > 0 && metrics
                                  .filter(metric => metric && typeof metric === 'object' && metric.id && metric.name)
                                  .map((metric) => (
                                    <SelectItem key={`metric-${metric.id}`} value={`metric_${metric.id}`}>
                                      {metric.name} (Metric)
                                    </SelectItem>
                                  ))
                                }
                                {Array.isArray(customFields) && customFields.length > 0 && customFields
                                  .filter(field => field && typeof field === 'object' && field.id && field.name)
                                  .map((field) => (
                                    <SelectItem key={`custom-${field.id}`} value={`custom_${field.id}`}>
                                      {field.name} (Custom)
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </ErrorBoundary>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {saveStatus && (
                      <div className="flex items-center gap-2 text-green-600">
                        <MdCheckCircle />
                        <span className="text-sm font-medium">{saveStatus}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => {
                        try {
                          const profileName = prompt('Save this mapping as a profile:');
                          if (profileName && typeof createMappingProfile === 'function') {
                            const description = prompt('Profile description:') || '';
                            const source = prompt('Data source:') || 'Unknown';
                            createMappingProfile(profileName, description, source);
                          }
                        } catch (error) {
                          console.error('Profile creation error:', error);
                          alert('Error creating profile');
                        }
                      }}
                      className="btn-secondary"
                    >
                      <MdSave className="mr-2" />
                      Save as Profile
                    </Button>
                    <Button 
                      onClick={() => {
                        try {
                          // TODO: Process the mapped CSV data
                          setSaveStatus('CSV data processing is ready!');
                          setTimeout(() => setSaveStatus(''), 3000);
                          setShowMappingWizard(false);
                          setCsvHeaders([]);
                          setCsvPreviewData([]);
                          setFieldMappings({});
                        } catch (error) {
                          console.error('Import error:', error);
                          setSaveStatus('Error during import');
                          setTimeout(() => setSaveStatus(''), 3000);
                        }
                      }}
                      className="btn-primary"
                    >
                      <MdCloudUpload className="mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "customers" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Customer Management</h1>
              <p className="text-slate-600 mt-1">Manage your customer data and interactions</p>
            </div>
            
            <div className="content-body">
              {/* Add your customer management components here */}
            </div>
          </div>
        )}

        {currentPage === "settings" && (
          <div className="fade-in">
            <div className="content-header">
              <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
              <p className="text-slate-600 mt-1">Configure application settings and preferences</p>
            </div>
            
            <div className="content-body">
              {/* Add your settings components here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthScoreApp; 