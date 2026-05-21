import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Line,
  LineChart,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calculator, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { budgetData, BudgetCategory, BudgetItem } from './data/budgetData';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// We keep getFundingCategory if the user meant the existing group for "por recurso"
// But better to list the actual specific resources from the data.
const SPECIFIC_RESOURCES = Array.from(new Set(budgetData.filter(d => d.category === 'Ingresos').map(d => `${d.resourceCode} - ${d.description}`))).sort();
const MAIN_CATEGORIES = ['Recursos Nación', 'Recursos Propios'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value}`;
}

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const INDICADORS_DATA: Record<number, { ipc: number; salarioMinimo: number; decreto1278: number }> = {
  2020: { ipc: 1.61, salarioMinimo: 6.0, decreto1278: 5.12 },
  2021: { ipc: 5.62, salarioMinimo: 3.5, decreto1278: 2.61 },
  2022: { ipc: 13.12, salarioMinimo: 10.07, decreto1278: 7.26 },
  2023: { ipc: 9.28, salarioMinimo: 16.0, decreto1278: 14.62 },
  2024: { ipc: 5.2, salarioMinimo: 12.0, decreto1278: 10.88 },
  2025: { ipc: 5.1, salarioMinimo: 9.5, decreto1278: 8.6 },
  2026: { ipc: 4.0, salarioMinimo: 23.0, decreto1278: 7.0 },
};

export default function App() {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [includeHonorarios, setIncludeHonorarios] = useState<boolean>(true);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>(SPECIFIC_RESOURCES[0]);
  const [selectedMainIncomeCategory, setSelectedMainIncomeCategory] = useState<string>('Todos');

  const [showVarGastos, setShowVarGastos] = useState<boolean>(true);
  const [showIpc, setShowIpc] = useState<boolean>(true);
  const [showSalarioMinimo, setShowSalarioMinimo] = useState<boolean>(true);
  const [showDecreto1278, setShowDecreto1278] = useState<boolean>(true);

  const resourceEvolutionData = useMemo(() => {
    return YEARS.map((year) => {
      const yearRecords = budgetData.filter(
        (d) =>
          d.year === year &&
          `${d.resourceCode} - ${d.description}` === selectedResourceCategory &&
          d.category === 'Ingresos'
      );

      const ingresos = yearRecords.reduce((acc, curr) => acc + curr.amount, 0);

      return {
        year,
        ingresos,
      };
    });
  }, [selectedResourceCategory]);

  const aggregatedData = useMemo(() => {
    return YEARS.map((year) => {
      const yearRecords = budgetData.filter((d) => d.year === year);
      
      const inRecords = yearRecords.filter((d) => d.category === 'Ingresos');
      const filteredInRecords = selectedMainIncomeCategory === 'Todos' 
        ? inRecords 
        : inRecords.filter(d => d.source === selectedMainIncomeCategory);
        
      const ingresos = filteredInRecords.reduce((acc, curr) => acc + curr.amount, 0);
      
      const outRecords = yearRecords.filter((d) => d.category !== 'Ingresos');
      
      const nomina = outRecords.filter((d) => d.category === 'Nómina').reduce((acc, curr) => acc + curr.amount, 0);
      const honorarios = outRecords.filter((d) => d.category === 'Honorarios').reduce((acc, curr) => acc + curr.amount, 0);

      const gastosTotales = includeHonorarios ? nomina + honorarios : nomina;
      const delta = ingresos - gastosTotales;

      return {
        year,
        ingresos,
        nomina,
        honorarios,
        gastosTotales,
        delta,
      };
    });
  }, [includeHonorarios, selectedMainIncomeCategory]);

  const currentYearData = aggregatedData.find((d) => d.year === selectedYear) || {
    year: selectedYear,
    ingresos: 0,
    nomina: 0,
    honorarios: 0,
    gastosTotales: 0,
    delta: 0,
  };
  const prevYearData = aggregatedData.find((d) => d.year === selectedYear - 1);

  const gastosVar =
    prevYearData && prevYearData.gastosTotales > 0
      ? ((currentYearData.gastosTotales - prevYearData.gastosTotales) / prevYearData.gastosTotales) * 100
      : 0;

  const comparativeData = useMemo(() => {
    return YEARS.map((year) => {
      const currentGastos = aggregatedData.find(d => d.year === year)?.gastosTotales || 0;
      const prevGastos = aggregatedData.find(d => d.year === year - 1)?.gastosTotales || 0;
      
      let varGastos = null;
      if (prevGastos > 0) {
         varGastos = Number((((currentGastos - prevGastos) / prevGastos) * 100).toFixed(2));
      }
      
      return {
        year,
        varGastos,
        ipc: INDICADORS_DATA[year].ipc,
        salarioMinimo: INDICADORS_DATA[year].salarioMinimo,
        decreto1278: INDICADORS_DATA[year].decreto1278
      };
    });
  }, [aggregatedData]);

  const breakdownData = useMemo(() => {
    let records = budgetData.filter(
      (d) => d.year === selectedYear && (d.category === 'Nómina' || (includeHonorarios && d.category === 'Honorarios'))
    );

    if (selectedMainIncomeCategory !== 'Todos') {
      records = records.filter(d => d.source === selectedMainIncomeCategory);
    }

    const categoryMap: Record<string, number> = {};
    records.forEach((r) => {
      // Grouping by specific resource for detailed breakdown
      const name = `${r.resourceCode} - ${r.description}`;
      categoryMap[name] = (categoryMap[name] || 0) + r.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedYear, includeHonorarios]);

  return (
    <div className="min-h-screen bg-[var(--color-background-dark)] text-gray-100 p-6 sm:p-10 font-sans selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Dashboard Presupuestal <span className="text-[var(--color-primary)]">UPTC</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
              Análisis del comportamiento del gasto de personal frente a los ingresos de funcionamiento (2020-2026).
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-[var(--color-surface)] p-2 rounded-xl border border-white/5 shadow-xl">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-gray-900 text-white">
                    Vigencia {y}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-px h-6 bg-white/10 hidden sm:block" />

            <button
              onClick={() => setIncludeHonorarios(!includeHonorarios)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors focus:outline-none group"
            >
              {includeHonorarios ? (
                <ToggleRight className="w-6 h-6 text-[var(--color-primary)] transition-transform group-hover:scale-105" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-400 transition-transform group-hover:scale-105" />
              )}
              <span className={cn("text-sm font-medium", includeHonorarios ? "text-white" : "text-gray-400")}>
                Incluir Honorarios
              </span>
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Gasto Nómina"
            value={currentYearData.nomina}
            icon={<Users className="w-5 h-5 text-[var(--color-primary)]" />}
          />
          <KpiCard
            title="Total Honorarios"
            value={currentYearData.honorarios}
            icon={<Calculator className="w-5 h-5 text-gray-300" />}
            dimmed={!includeHonorarios}
          />
          <KpiCard
            title="Delta (Ingresos - Gastos)"
            value={currentYearData.delta}
            icon={<DollarSign className={cn("w-5 h-5", currentYearData.delta >= 0 ? "text-emerald-400" : "text-red-400")} />}
            valueColor={currentYearData.delta >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <KpiCard
            title="Variación Gastos"
            value={`${gastosVar > 0 ? '+' : ''}${gastosVar.toFixed(2)}%`}
            icon={gastosVar > 0 ? <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" /> : <TrendingDown className="w-5 h-5 text-white" />}
            valueColor={gastosVar > 0 ? "text-[var(--color-primary)]" : "text-white"}
            isCurrency={false}
            subtitle={`Vs. Vigencia ${selectedYear - 1}`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-white">Evolución de Ingresos vs Gastos de Nomina</h2>
                <p className="text-xs text-gray-500 mt-1">Comparativa histórica 2020-2026. Gastos de nomina vs Ingresos.</p>
              </div>
              <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                <span className="text-xs font-medium text-gray-400 pl-2">Ingresos:</span>
                <select
                  value={selectedMainIncomeCategory}
                  onChange={(e) => setSelectedMainIncomeCategory(e.target.value)}
                  className="bg-transparent text-[var(--color-primary)] font-semibold text-sm focus:outline-none focus:ring-0 cursor-pointer outline-none border-none py-1"
                >
                  <option value="Todos" className="bg-gray-900">Todos los recursos</option>
                  {MAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-gray-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="year" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    stroke="#888" 
                    tick={{ fill: '#888', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    name={`Ingresos (${selectedMainIncomeCategory})`}
                    dataKey="ingresos"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }}
                  />
                  <Area
                    type="monotone"
                    name="Gastos de Nomina"
                    dataKey="gastosTotales"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGastos)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Bar Chart */}
          <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white">
                Desglose de Gastos {selectedMainIncomeCategory !== 'Todos' && `(${selectedMainIncomeCategory})`}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Vigencia {selectedYear}</p>
            </div>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={110}
                    tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#ffffff05' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1A1A] border border-white/10 p-3 rounded-lg shadow-xl shrink-0">
                            <p className="text-sm font-medium text-white mb-1">{payload[0].payload.name}</p>
                            <p className="text-[var(--color-primary)] font-bold text-sm">
                              {formatCurrency(Number(payload[0].value))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--color-primary)"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Comparative Indicators Section */}
        <div className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Comparativa de Incrementos vs Variación de Gastos</h2>
              <p className="text-sm text-gray-500 mt-1">
                Visualice cómo variaron los gastos frente a los indicadores económicos clave del país.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-[var(--color-surface)] p-2 rounded-xl border border-white/5 shadow-xl px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                <input type="checkbox" checked={showVarGastos} onChange={() => setShowVarGastos(!showVarGastos)} className="accent-[var(--color-primary)]" />
                Variación Gastos Totales
              </label>
              <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                <input type="checkbox" checked={showIpc} onChange={() => setShowIpc(!showIpc)} className="accent-blue-400" />
                IPC
              </label>
              <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                <input type="checkbox" checked={showDecreto1278} onChange={() => setShowDecreto1278(!showDecreto1278)} className="accent-purple-400" />
                Dcto 1278
              </label>
              <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                <input type="checkbox" checked={showSalarioMinimo} onChange={() => setShowSalarioMinimo(!showSalarioMinimo)} className="accent-emerald-400" />
                Salario Mín.
              </label>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparativeData.filter(d => d.varGastos !== null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="year" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    stroke="#888" 
                    tick={{ fill: '#888', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <RechartsTooltip 
                    cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '4 4' }} 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1A1A] border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                            <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wider">{label}</p>
                            <div className="space-y-2">
                              {payload.map((entry, index) => (
                                <div key={index} className="flex justify-between items-center text-sm gap-4">
                                  <span className="flex items-center gap-2 text-gray-300" style={{ color: entry.color }}>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    {entry.name}
                                  </span>
                                  <span className="font-bold text-white">
                                    {(entry.value as number).toFixed(2)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  {showVarGastos && (
                    <Line type="monotone" name="Variación Gastos" dataKey="varGastos" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }} />
                  )}
                  {showIpc && (
                    <Line type="monotone" name="IPC" dataKey="ipc" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#60a5fa' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }} />
                  )}
                  {showDecreto1278 && (
                    <Line type="monotone" name="Aumento Decreto 1278" dataKey="decreto1278" stroke="#c084fc" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#c084fc' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#c084fc' }} />
                  )}
                  {showSalarioMinimo && (
                    <Line type="monotone" name="Aumento Salario Mínimo" dataKey="salarioMinimo" stroke="#34d399" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#34d399' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#34d399' }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Resource Analysis Section */}
        <div className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Evolución Detallada por Recurso (Ingresos)</h2>
              <p className="text-sm text-gray-500 mt-1">Histórico de ingresos filtrados por fuente de financiación.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-[var(--color-surface)] p-2 rounded-xl border border-white/5 shadow-xl px-3">
              <span className="text-sm font-medium text-gray-400">Filtrar:</span>
              <select
                value={selectedResourceCategory}
                onChange={(e) => setSelectedResourceCategory(e.target.value)}
                className="bg-transparent text-[var(--color-primary)] font-bold text-sm focus:outline-none focus:ring-0 cursor-pointer outline-none border-none py-1 max-w-[200px] sm:max-w-[400px] text-ellipsis overflow-hidden truncate"
              >
                {SPECIFIC_RESOURCES.map(cat => (
                  <option key={cat} value={cat} className="bg-gray-900 text-white gap-2">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resourceEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorResourceIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="year" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    stroke="#888" 
                    tick={{ fill: '#888', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    name={`Ingresos (${selectedResourceCategory})`}
                    dataKey="ingresos"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResourceIngresos)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponents

function KpiCard({ 
  title, 
  value, 
  icon, 
  dimmed = false,
  valueColor = "text-white",
  isCurrency = true,
  subtitle
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  dimmed?: boolean;
  valueColor?: string;
  isCurrency?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={cn(
      "bg-[var(--color-surface)] border border-white/5 rounded-2xl p-5 shadow-xl transition-opacity duration-300",
      dimmed ? "opacity-40 grayscale" : "opacity-100"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-black/30 rounded-lg">
          {icon}
        </div>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      </div>
      <div>
        <div className={cn("text-2xl font-bold tracking-tight", valueColor)}>
          {isCurrency && typeof value === 'number' ? formatCurrency(value) : value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
        <p className="text-sm font-medium text-gray-400 mb-3 border-b border-white/10 pb-2">Vigencia {label}</p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                {entry.name}
              </div>
              <p className="text-sm font-semibold pl-4" style={{ color: entry.stroke || entry.fill }}>
                {formatCurrency(entry.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
