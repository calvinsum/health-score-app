import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  MdConfirmationNumber
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

const HealthScoreApp = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'customer', 'score', 'status', 'action'
  ]);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showCSVUploader, setShowCSVUploader] = useState(false);

  // State for metrics
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: "1", name: "Ticket", weight: 30, inputType: "upload", lowerBand: 0, upperBand: 24, lowerIsBetter: true, useTrending: true },
    { id: "2", name: "Adoption", weight: 20, inputType: "upload", lowerBand: 0, upperBand: 100, lowerIsBetter: false, useTrending: false },
    { id: "3", name: "GMV", weight: 25, inputType: "upload", lowerBand: 0, upperBand: 1000000, lowerIsBetter: false, useTrending: false },
    { id: "4", name: "Sentiment", weight: 25, inputType: "manual", lowerBand: 1, upperBand: 10, lowerIsBetter: false, useTrending: false }
  ]);

  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: "1", name: "Industry", type: "select", required: true, options: ["Retail", "Healthcare", "Finance", "Technology"] },
    { id: "2", name: "Contract Value", type: "number", required: false },
    { id: "3", name: "Start Date", type: "date", required: true }
  ]);

  const [scoreGroups, setScoreGroups] = useState<ScoreGroup[]>([
    { id: "1", name: "Green", minScore: 90, maxScore: 100, action: "Excellent performance - continue current strategy", color: "bg-green-100 text-green-800 border-green-200" },
    { id: "2", name: "Yellow", minScore: 70, maxScore: 89, action: "Good performance - monitor closely and follow-up within 7 days", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    { id: "3", name: "Red", minScore: 0, maxScore: 69, action: "Poor performance - urgent escalation and intervention within 24 hours", color: "bg-red-100 text-red-800 border-red-200" },
    { id: "4", name: "Grey", minScore: 0, maxScore: 0, action: "Neutral status - awaiting data or assessment", color: "bg-gray-100 text-gray-800 border-gray-200" }
  ]);

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

  const [merchants, setMerchants] = useState<Merchant[]>([]);

  // Add sample merchants for demonstration
  useEffect(() => {
    if (merchants.length === 0) {
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

  // Update selected columns when metrics or custom fields change
  useEffect(() => {
    const newColumns = ['customer'];
    
    // Add metric columns
    metrics.forEach(metric => {
      newColumns.push(`metric_${metric.id}`);
    });
    
    // Add standard columns
    newColumns.push('score', 'status', 'action');
    
    // Only update if we don't have any current selection or if metrics/fields changed significantly
    if (selectedColumns.length <= 5) {
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

  // Data submission states
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualValue, setManualValue] = useState<string>("");
  const [dataSubmissions, setDataSubmissions] = useState<DataSubmission[]>([
    { id: "1", metricId: "1", metricName: "Ticket", month: "November", year: "2024", fileName: "tickets_nov.csv", submittedAt: "2024-11-15", status: "processed" },
    { id: "2", metricId: "2", metricName: "Adoption", month: "October", year: "2024", fileName: "adoption_oct.xlsx", submittedAt: "2024-11-01", status: "processed" }
  ]);

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
      const color = newScoreGroup.name.toLowerCase() === "green" ? "bg-green-100 text-green-800 border-green-200" :
                   newScoreGroup.name.toLowerCase() === "yellow" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                   newScoreGroup.name.toLowerCase() === "red" ? "bg-red-100 text-red-800 border-red-200" :
                   newScoreGroup.name.toLowerCase() === "grey" || newScoreGroup.name.toLowerCase() === "gray" ? "bg-gray-100 text-gray-800 border-gray-200" :
                   "bg-blue-100 text-blue-800 border-blue-200";
      
      setScoreGroups([...scoreGroups, { 
        id: Date.now().toString(), 
        ...newScoreGroup,
        color
      }]);
      setNewScoreGroup({ name: "", minScore: 0, maxScore: 0, action: "" });
    }
  };

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
    { id: "customers", label: "Customers", icon: <MdPeople /> },
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
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${group.color}`}>
                              {group.name}
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

        {currentPage === "customers" && (
          <div className="fade-in">
            <div className="content-header">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Customer Health Reports</h1>
                  <p className="text-slate-600 mt-1">Monitor and analyze customer performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={generateCSVTemplate} className="btn-secondary flex items-center gap-2">
                    <MdFileDownload />
                    Generate CSV Template
                  </Button>
                  <Button 
                    onClick={() => setShowCSVUploader(!showCSVUploader)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <MdFileUpload />
                    Upload CSV Data
                  </Button>
                  <Button className="btn-success flex items-center gap-2">
                    <MdAssessment />
                    Export Report
                  </Button>
                </div>
              </div>
              
              {/* CSV Upload Dropdown */}
              {showCSVUploader && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white shadow-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <div>
                      <label className="form-label">Upload CSV File</label>
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50">
                        <input
                          type="file"
                          onChange={handleCSVUpload}
                          accept=".csv"
                          className="hidden"
                          id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <div className="text-2xl flex justify-center">
                              <MdCloudUpload className="text-blue-500" />
                            </div>
                            <div className="text-sm font-medium text-blue-700">
                              {uploadedCSV ? uploadedCSV.name : "Click to upload CSV file"}
                            </div>
                            <div className="text-xs text-gray-500">
                              Use the template format for best results
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Preview Section */}
                    <div>
                      <label className="form-label">Import Preview</label>
                      {csvData.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-32 overflow-y-auto">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Found {csvData.length} records to import:
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            {csvData.slice(0, 2).map((row, index) => (
                              <div key={index} className="truncate">
                                {row.name} - {row.accountId} ({row.month} {row.year})
                              </div>
                            ))}
                            {csvData.length > 2 && (
                              <div className="font-medium">...and {csvData.length - 2} more</div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button onClick={importCSVData} className="btn-primary flex-1">
                              Import {csvData.length} Records
                            </Button>
                            <Button 
                              onClick={() => {
                                setCsvData([]);
                                setUploadedCSV(null);
                                setShowCSVUploader(false);
                              }}
                              className="btn-secondary"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center text-gray-500 text-sm">
                          Upload a CSV file to see preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="content-body space-y-6">
              {/* Date Range and Controls Section */}
              <div className="professional-card">
                <div className="card-content-professional">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MdDateRange className="text-gray-600 text-sm" />
                        <label className="form-label mb-0">From Date</label>
                        <Input 
                          type="date" 
                          className="form-control w-40"
                          defaultValue="2024-11-01"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <MdDateRange className="text-gray-600 text-sm" />
                        <label className="form-label mb-0">To Date</label>
                        <Input 
                          type="date" 
                          className="form-control w-40"
                          defaultValue="2024-11-30"
                        />
                      </div>
                      <Button className="btn-primary flex items-center gap-2">
                        <MdRefresh />
                        LOAD DATA
                      </Button>
                    </div>
                    
                    {/* Column Selection Controls */}
                    <div className="flex items-center gap-3">
                      <div className="dropdown-container">
                        <label className="form-label mb-2">Quick Column Selection</label>
                        <Select 
                          value={selectedColumns.length > 0 ? "custom" : "none"} 
                          onValueChange={(value) => {
                            if (value === "all") {
                              setSelectedColumns(availableColumns.map(col => col.id));
                            } else if (value === "standard") {
                              setSelectedColumns(['customer', 'score', 'status', 'action']);
                            } else if (value === "metrics") {
                              setSelectedColumns(['customer', ...metrics.map(m => `metric_${m.id}`), 'score']);
                            }
                          }}
                        >
                          <SelectTrigger className="dropdown-trigger">
                            <SelectValue placeholder={`Columns (${selectedColumns.length})`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <MdTableChart />
                                <span>All Columns ({availableColumns.length})</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="standard">
                              <div className="flex items-center gap-2">
                                <HiOutlineDocumentText />
                                <span>Standard Columns</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="metrics">
                              <div className="flex items-center gap-2">
                                <FiBarChart />
                                <span>Metrics Only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="form-label mb-2">Customize Columns</label>
                        <Button 
                          onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <MdSettings />
                          <span>{showColumnCustomizer ? 'Hide Options' : 'Show Options'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Column Customizer */}
                  {showColumnCustomizer && (
                    <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex gap-6">
                        {/* Column Selection */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-3">Select Columns</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {availableColumns.map((column) => (
                              <label key={column.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedColumns.includes(column.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedColumns([...selectedColumns, column.id]);
                                    } else {
                                      setSelectedColumns(selectedColumns.filter(col => col !== column.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="mr-1">{column.icon}</span>
                                <span className="text-gray-700">{column.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Column Ordering */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-3">Column Order</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedColumns.map((columnId, index) => {
                              const column = availableColumns.find(col => col.id === columnId);
                              if (!column) return null;
                              
                              return (
                                <div key={columnId} className="flex items-center gap-2 p-2 bg-white rounded border">
                                  <span className="text-xs text-gray-500 w-6">{index + 1}</span>
                                  <span className="mr-1">{column.icon}</span>
                                  <span className="flex-1 text-sm">{column.label}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moveColumnUp(columnId)}
                                      disabled={index === 0}
                                      className="w-6 h-6 p-0 text-xs"
                                    >
                                      <MdArrowUpward />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moveColumnDown(columnId)}
                                      disabled={index === selectedColumns.length - 1}
                                      className="w-6 h-6 p-0 text-xs"
                                    >
                                      <MdArrowDownward />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {selectedColumns.length} of {availableColumns.length} columns selected
                        </span>
                        <Button 
                          onClick={() => setShowColumnCustomizer(false)}
                          className="btn-primary"
                        >
                          Apply Changes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

              {/* Main Data Table */}
              <div className="professional-table">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        {selectedColumns.map((columnId) => {
                          const column = availableColumns.find(col => col.id === columnId);
                          if (!column) return null;
                          
                          // Handle different column types
                          if (columnId === 'customer') {
                            return (
                              <th key={columnId} className="text-left">
                                <div className="flex items-center gap-2">
                                  <MdBusiness />
                                  <span>Customer Name</span>
                                </div>
                              </th>
                            );
                          } else if (columnId === 'score') {
                            return (
                              <th key={columnId} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <MdAssessment />
                                  <span>Health Score</span>
                                </div>
                              </th>
                            );
                          } else if (columnId === 'status') {
                            return (
                              <th key={columnId} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <MdCheckCircle />
                                  <span>Status</span>
                                </div>
                              </th>
                            );
                          } else if (columnId === 'action') {
                            return (
                              <th key={columnId} className="text-left">
                                <div className="flex items-center gap-2">
                                  <MdWarning />
                                  <span>Required Action</span>
                                </div>
                              </th>
                            );
                          } else if (columnId.startsWith('custom_')) {
                            const fieldId = columnId.replace('custom_', '');
                            const field = customFields.find(f => f.id === fieldId);
                            if (!field) return null;
                            return (
                              <th key={columnId} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <HiOutlineDocumentText />
                                  <span>{field.name}</span>
                                  {field.required && <span className="text-red-500">*</span>}
                                </div>
                              </th>
                            );
                          } else if (columnId.startsWith('metric_')) {
                            const metricId = columnId.replace('metric_', '');
                            const metric = metrics.find(m => m.id === metricId);
                            if (!metric) return null;
                            return (
                              <th key={columnId} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {metric.name.toLowerCase().includes('ticket') ? <MdConfirmationNumber /> :
                                   metric.name.toLowerCase().includes('adoption') ? <MdTrendingUp /> :
                                   metric.name.toLowerCase().includes('gmv') ? <MdAttachMoney /> :
                                   metric.name.toLowerCase().includes('sentiment') ? <MdSentimentSatisfied /> : <FiBarChart />}
                                  <span>{metric.name}</span>
                                </div>
                              </th>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {merchants
                        .filter(m => 
                          (!selectedMonth || m.month === selectedMonth) && 
                          (!selectedYear || m.year === selectedYear)
                        )
                        .map((merchant, index) => (
                          <tr key={merchant.id} className="table-row">
                            {selectedColumns.map((columnId) => {
                              // Handle different column types for rows
                              if (columnId === 'customer') {
                                return (
                                  <td key={columnId} className="table-cell">
                                    <div>
                                      <div className="font-semibold text-gray-900">{merchant.name}</div>
                                      <div className="text-sm text-gray-500">{merchant.accountId}</div>
                                    </div>
                                  </td>
                                );
                              } else if (columnId === 'score') {
                                return (
                                  <td key={columnId} className="table-cell text-center">
                                    <div className="font-bold text-2xl text-gray-900">{merchant.score}</div>
                                  </td>
                                );
                              } else if (columnId === 'status') {
                                return (
                                  <td key={columnId} className="table-cell text-center">
                                    <span className={`status-badge ${
                                      merchant.status === 'Green' ? 'status-healthy' :
                                      merchant.status === 'Yellow' ? 'status-warning' : 
                                      'status-critical'
                                    }`}>
                                      {merchant.status}
                                    </span>
                                  </td>
                                );
                              } else if (columnId === 'action') {
                                return (
                                  <td key={columnId} className="table-cell">
                                    <div className="text-sm text-gray-700 font-medium">{merchant.action}</div>
                                  </td>
                                );
                              } else if (columnId.startsWith('custom_')) {
                                const fieldId = columnId.replace('custom_', '');
                                const field = customFields.find(f => f.id === fieldId);
                                if (!field) return null;
                                return (
                                  <td key={columnId} className="table-cell text-center">
                                    <div className="text-sm text-gray-700">
                                      {merchant.customFields?.[field.id] || 
                                       (field.required ? (
                                         <span className="text-red-500 italic">Required</span>
                                       ) : (
                                         <span className="text-gray-400">N/A</span>
                                       ))
                                    }
                                    </div>
                                  </td>
                                );
                              } else if (columnId.startsWith('metric_')) {
                                const metricId = columnId.replace('metric_', '');
                                const metric = metrics.find(m => m.id === metricId);
                                if (!metric) return null;
                                
                                return (
                                  <td key={columnId} className="table-cell text-center">
                                    <div>
                                      {/* Manual Input Field for Manual Metrics */}
                                      {metric.inputType === 'manual' && !metric.useTrending ? (
                                        <div className="space-y-2">
                                          <Input
                                            type="number"
                                            value={
                                              typeof merchant.metricValues[metric.id] === 'number' 
                                                ? (merchant.metricValues[metric.id] as number).toString()
                                                : ''
                                            }
                                            onChange={(e) => {
                                              const newValue = parseFloat(e.target.value) || 0;
                                              updateMerchantMetricValue(merchant.id, metric.id, newValue);
                                            }}
                                            className="form-control text-center w-24 mx-auto"
                                            placeholder="0"
                                            min={metric.lowerBand}
                                            max={metric.upperBand}
                                          />
                                          <div className="text-xs text-gray-500">
                                            Range: {metric.lowerBand}-{metric.upperBand}
                                          </div>
                                        </div>
                                      ) : (
                                        // Display-only for Upload metrics or Trending metrics
                                        <div className="font-semibold text-gray-900">
                                          {merchant.metricValues[metric.id] !== undefined ? (
                                            <>
                                              {(() => {
                                                const value = merchant.metricValues[metric.id];
                                                if (metric.useTrending && Array.isArray(value)) {
                                                  // Trending display: show M4 (most recent) with trend indicator
                                                  const mostRecent = value[3] || 0;
                                                  return (
                                                    <div className="flex items-center gap-1">
                                                      <span>
                                                        {metric.name.toLowerCase().includes('ticket') && `${mostRecent} tickets`}
                                                        {metric.name.toLowerCase().includes('adoption') && mostRecent}
                                                        {metric.name.toLowerCase().includes('gmv') && mostRecent.toLocaleString()}
                                                        {metric.name.toLowerCase().includes('sentiment') && mostRecent}
                                                        {!metric.name.toLowerCase().includes('ticket') && 
                                                         !metric.name.toLowerCase().includes('adoption') && 
                                                         !metric.name.toLowerCase().includes('gmv') && 
                                                         !metric.name.toLowerCase().includes('sentiment') && 
                                                         mostRecent}
                                                      </span>
                                                      <MdTrendingUp className="text-xs text-blue-500" />
                                                    </div>
                                                  );
                                                } else if (typeof value === 'number') {
                                                  // Single value display
                                                  return (
                                                    <>
                                                      {metric.name.toLowerCase().includes('ticket') && `${value} tickets`}
                                                      {metric.name.toLowerCase().includes('adoption') && value}
                                                      {metric.name.toLowerCase().includes('gmv') && value.toLocaleString()}
                                                      {metric.name.toLowerCase().includes('sentiment') && value}
                                                      {!metric.name.toLowerCase().includes('ticket') && 
                                                       !metric.name.toLowerCase().includes('adoption') && 
                                                       !metric.name.toLowerCase().includes('gmv') && 
                                                       !metric.name.toLowerCase().includes('sentiment') && 
                                                       value}
                                                    </>
                                                  );
                                                } else {
                                                  return 'Invalid Data';
                                                }
                                              })()}
                                            </>
                                          ) : (
                                            <span className="text-gray-400 italic">
                                              {metric.inputType === 'upload' ? 'Upload Required' : 'No Data'}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Status Badge */}
                                      {merchant.metricValues[metric.id] !== undefined && (
                                        <div className={`mt-1 ${
                                          // Dynamic target evaluation based on metric type
                                          (() => {
                                            const value = merchant.metricValues[metric.id];
                                            
                                            if (metric.useTrending && Array.isArray(value) && value.length === 4) {
                                              const [m1, m2, m3, m4] = value;
                                              if (m1 < m2 && m2 < m3 && m3 < m4) return 'trending-badge trending-up';
                                              if (m1 === m2 && m2 === m3 && m3 === m4) return 'trending-badge trending-equal';
                                              if (m1 > m2 && m2 > m3 && m3 > m4) return 'trending-badge trending-down';
                                              return 'trending-badge trending-mixed';
                                            } else if (typeof value === 'number') {
                                              // Single value comparison - use existing metric-badge classes
                                              if (metric.lowerIsBetter) {
                                                return value <= metric.upperBand ? 'metric-badge metric-good' : 'metric-badge metric-bad';
                                              } else {
                                                return value >= metric.lowerBand ? 'metric-badge metric-good' : 'metric-badge metric-bad';
                                              }
                                            } else {
                                              return 'metric-badge metric-bad'; // Invalid data
                                            }
                                          })()
                                        }`}>
                                          {(() => {
                                            const value = merchant.metricValues[metric.id];
                                            
                                            if (metric.useTrending && Array.isArray(value) && value.length === 4) {
                                              const [m1, m2, m3, m4] = value;
                                              if (m1 < m2 && m2 < m3 && m3 < m4) return 'Trending Up';
                                              if (m1 === m2 && m2 === m3 && m3 === m4) return 'Stable';
                                              if (m1 > m2 && m2 > m3 && m3 > m4) return 'Trending Down';
                                              return 'Mixed Trend';
                                            } else if (typeof value === 'number') {
                                              if (metric.lowerIsBetter) {
                                                return value <= metric.upperBand ? 'Healthy' : 'Unhealthy';
                                              } else {
                                                return value >= metric.lowerBand ? 'Healthy' : 'Unhealthy';
                                              }
                                            } else {
                                              return 'Invalid';
                                            }
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              }
                              return null;
                            })}
                          </tr>
                        ))}
                    </tbody>
                    {/* Summary Footer */}
                    <tfoot>
                      <tr className="table-footer">
                        {selectedColumns.map((columnId) => {
                          if (columnId === 'customer') {
                            return <td key={columnId}>TOTALS ({merchants.length} Records)</td>;
                          } else if (columnId === 'score') {
                            return (
                              <td key={columnId} className="text-center font-bold text-xl">
                                {merchants.length > 0 ? Math.round(merchants.reduce((sum, m) => sum + m.score, 0) / merchants.length) : 0}
                              </td>
                            );
                          } else if (columnId === 'status') {
                            return (
                              <td key={columnId} className="text-center">
                                {merchants.filter(m => m.status === 'Green').length}G / {merchants.filter(m => m.status === 'Yellow').length}Y / {merchants.filter(m => m.status === 'Red').length}R
                              </td>
                            );
                          } else if (columnId === 'action') {
                            return <td key={columnId}>Overall Performance Summary</td>;
                          } else if (columnId.startsWith('metric_')) {
                            const metricId = columnId.replace('metric_', '');
                            const metric = metrics.find(m => m.id === metricId);
                            if (!metric) return <td key={columnId}>-</td>;
                            const values = merchants
                              .map(m => {
                                const value = m.metricValues[metric.id];
                                if (metric.useTrending && Array.isArray(value) && value.length === 4) {
                                  // For trending, use the most recent value (M4)
                                  return value[3];
                                } else if (typeof value === 'number') {
                                  return value;
                                } else {
                                  return undefined;
                                }
                              })
                              .filter(v => v !== undefined) as number[];
                            const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
                            return (
                              <td key={columnId} className="text-center">
                                {metric.name.toLowerCase().includes('ticket') && `${avg.toFixed(1)} tickets avg`}
                                {metric.name.toLowerCase().includes('adoption') && `${avg.toFixed(1)} avg`}
                                {metric.name.toLowerCase().includes('gmv') && `${avg.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} avg`}
                                {metric.name.toLowerCase().includes('sentiment') && `${avg.toFixed(1)} avg`}
                                {!metric.name.toLowerCase().includes('ticket') && 
                                 !metric.name.toLowerCase().includes('adoption') && 
                                 !metric.name.toLowerCase().includes('gmv') && 
                                 !metric.name.toLowerCase().includes('sentiment') && 
                                 `${avg.toFixed(1)} avg`}
                              </td>
                            );
                          } else {
                            return <td key={columnId} className="text-center">-</td>;
                          }
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthScoreApp; 