
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useControlUsage, useControlTypes, useTicketCategories } from '@/hooks/useSupabaseData';
import { CalendarDays, Clock, Users, Filter } from 'lucide-react';
import { format, startOfHour, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ControlAnalytics = () => {
  const { data: controlUsage = [] } = useControlUsage();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();

  const [selectedControlType, setSelectedControlType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('today');
  const [chartType, setChartType] = useState<string>('bar');

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return controlUsage.filter(usage => {
      const usageDate = parseISO(usage.used_at);
      const now = new Date();
      
      // Time range filter
      let timeFilter = true;
      if (timeRange === 'today') {
        timeFilter = usageDate.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        timeFilter = usageDate >= weekAgo;
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        timeFilter = usageDate >= monthAgo;
      }

      // Control type filter
      const controlFilter = selectedControlType === 'all' || usage.control_type_id === selectedControlType;
      
      // Category filter
      const categoryFilter = selectedCategory === 'all' || usage.attendee?.category_id === selectedCategory;

      return timeFilter && controlFilter && categoryFilter;
    });
  }, [controlUsage, selectedControlType, selectedCategory, timeRange]);

  // Group data by hour
  const hourlyData = useMemo(() => {
    const hourGroups: { [key: string]: number } = {};
    
    filteredData.forEach(usage => {
      const hour = startOfHour(parseISO(usage.used_at));
      const hourKey = format(hour, 'HH:mm', { locale: es });
      hourGroups[hourKey] = (hourGroups[hourKey] || 0) + 1;
    });

    return Object.entries(hourGroups)
      .map(([hour, count]) => ({ hour, count, usage: count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [filteredData]);

  // Data by control type
  const controlTypeData = useMemo(() => {
    const typeGroups: { [key: string]: number } = {};
    
    filteredData.forEach(usage => {
      const typeName = usage.control_type?.name || 'Unknown';
      typeGroups[typeName] = (typeGroups[typeName] || 0) + 1;
    });

    return Object.entries(typeGroups).map(([name, count]) => {
      const controlType = controlTypes.find(ct => ct.name === name);
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        usage: count,
        fill: controlType?.color || '#64748B'
      };
    });
  }, [filteredData, controlTypes]);

  // Data by category
  const categoryData = useMemo(() => {
    const categoryGroups: { [key: string]: number } = {};
    
    filteredData.forEach(usage => {
      const categoryName = usage.attendee?.ticket_category?.name || 'Unknown';
      categoryGroups[categoryName] = (categoryGroups[categoryName] || 0) + 1;
    });

    return Object.entries(categoryGroups).map(([name, count]) => {
      const category = ticketCategories.find(tc => tc.name === name);
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        usage: count,
        fill: category?.color || '#64748B'
      };
    });
  }, [filteredData, ticketCategories]);

  const chartConfig = {
    usage: {
      label: "Usos",
      color: "#D4AF37",
    },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-dorado flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-hueso mb-2 block">Período</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-empresarial border-gray-700 text-hueso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-hueso mb-2 block">Tipo de Control</label>
              <Select value={selectedControlType} onValueChange={setSelectedControlType}>
                <SelectTrigger className="bg-empresarial border-gray-700 text-hueso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all">Todos</SelectItem>
                  {controlTypes.map(ct => (
                    <SelectItem key={ct.id} value={ct.id} className="capitalize">
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-hueso mb-2 block">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-empresarial border-gray-700 text-hueso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all">Todas</SelectItem>
                  {ticketCategories.map(tc => (
                    <SelectItem key={tc.id} value={tc.id} className="capitalize">
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-hueso mb-2 block">Tipo de Gráfica</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="bg-empresarial border-gray-700 text-hueso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Líneas</SelectItem>
                  <SelectItem value="pie">Circular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-dorado mr-4" />
            <div>
              <p className="text-sm text-hueso">Total Usos</p>
              <p className="text-2xl font-bold text-dorado">{filteredData.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-dorado mr-4" />
            <div>
              <p className="text-sm text-hueso">Usuarios Únicos</p>
              <p className="text-2xl font-bold text-dorado">
                {new Set(filteredData.map(u => u.attendee_id)).size}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="flex items-center p-6">
            <CalendarDays className="h-8 w-8 text-dorado mr-4" />
            <div>
              <p className="text-sm text-hueso">Pico de Actividad</p>
              <p className="text-2xl font-bold text-dorado">
                {hourlyData.reduce((max, curr) => curr.count > max.count ? curr : max, { hour: '--', count: 0 }).hour}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-dorado">Uso por Horas</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#D1D5DB"
                    fontSize={12}
                  />
                  <YAxis stroke="#D1D5DB" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="usage" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#D1D5DB"
                    fontSize={12}
                  />
                  <YAxis stroke="#D1D5DB" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="#D4AF37" 
                    strokeWidth={3}
                    dot={{ fill: "#D4AF37", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-dorado">Uso por Tipo de Control</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={controlTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="usage"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {controlTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                ) : (
                  <BarChart data={controlTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#D1D5DB"
                      fontSize={12}
                    />
                    <YAxis stroke="#D1D5DB" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-dorado">Uso por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="usage"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                ) : (
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#D1D5DB"
                      fontSize={12}
                    />
                    <YAxis stroke="#D1D5DB" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ControlAnalytics;
