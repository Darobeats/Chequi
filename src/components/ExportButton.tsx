import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAttendees, useControlUsage, useControlTypes, useTicketCategories } from '@/hooks/useSupabaseData';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import * as ExcelJS from 'exceljs';

const ExportButton: React.FC = () => {
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: controlUsage = [] } = useControlUsage();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();
  const { data: event } = useActiveEventConfig();
  const { user } = useSupabaseAuth();

  const handleExport = async () => {
    if (isLoading || attendees.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      // ========== CÁLCULOS GENERALES ==========
      const uniqueAttendees = new Set(controlUsage.map(u => u.attendee_id));
      const attendedCount = uniqueAttendees.size;
      const noShowCount = attendees.length - attendedCount;
      const attendanceRate = attendees.length > 0 ? ((attendedCount / attendees.length) * 100).toFixed(1) : '0.0';
      const totalScans = controlUsage.length;

      // Análisis temporal
      const usageDates = controlUsage.map(u => new Date(u.used_at)).filter(d => !isNaN(d.getTime()));
      const firstEntry = usageDates.length > 0 ? new Date(Math.min(...usageDates.map(d => d.getTime()))) : null;
      const lastEntry = usageDates.length > 0 ? new Date(Math.max(...usageDates.map(d => d.getTime()))) : null;
      
      // Agrupar por hora para encontrar hora pico
      const hourlyScans = new Map<string, { scans: number; uniqueAttendees: Set<string> }>();
      controlUsage.forEach(usage => {
        const date = new Date(usage.used_at);
        if (isNaN(date.getTime())) return;
        const hour = `${String(date.getHours()).padStart(2, '0')}:00`;
        if (!hourlyScans.has(hour)) {
          hourlyScans.set(hour, { scans: 0, uniqueAttendees: new Set() });
        }
        const hourData = hourlyScans.get(hour)!;
        hourData.scans++;
        hourData.uniqueAttendees.add(usage.attendee_id);
      });

      let peakHour = 'N/A';
      let peakScans = 0;
      hourlyScans.forEach((data, hour) => {
        if (data.scans > peakScans) {
          peakScans = data.scans;
          peakHour = hour;
        }
      });

      const avgUsesPerPerson = attendedCount > 0 ? (totalScans / attendedCount).toFixed(1) : '0.0';

      // Estadísticas por categoría
      const categoryStats = ticketCategories.map(category => {
        const categoryAttendees = attendees.filter(a => a.category_id === category.id);
        const emitted = categoryAttendees.length;
        const attended = categoryAttendees.filter(a => uniqueAttendees.has(a.id)).length;
        const noShow = emitted - attended;
        const rate = emitted > 0 ? ((attended / emitted) * 100).toFixed(1) : '0.0';
        const totalUses = controlUsage.filter(u => {
          const attendee = attendees.find(a => a.id === u.attendee_id);
          return attendee && attendee.category_id === category.id;
        }).length;

        return {
          name: category.name,
          emitted,
          attended,
          noShow,
          rate,
          totalUses
        };
      });

      // Estadísticas por control
      const controlStats = controlTypes.map(control => {
        const usageCount = controlUsage.filter(u => u.control_type_id === control.id).length;
        const percentage = totalScans > 0 ? ((usageCount / totalScans) * 100).toFixed(1) : '0.0';
        return {
          name: control.name,
          count: usageCount,
          percentage
        };
      });

      // ========== CREAR WORKBOOK ==========
      const workbook = new ExcelJS.Workbook();
      
      // ========== HOJA 1: RESUMEN ==========
      const summarySheet = workbook.addWorksheet('RESUMEN');
      summarySheet.columns = [
        { width: 35 },
        { width: 20 }
      ];

      // Metadata
      summarySheet.addRow(['REPORTE DE ASISTENCIA EMPRESARIAL']);
      summarySheet.addRow(['Evento:', event?.event_name || 'Sin nombre']);
      summarySheet.addRow(['Fecha del Evento:', event?.event_date || 'N/A']);
      summarySheet.addRow([]);
      summarySheet.addRow(['Generado por:', user?.email || 'Sistema']);
      summarySheet.addRow(['Fecha de Generación:', new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })]);
      summarySheet.addRow(['Hora de Generación:', new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })]);
      summarySheet.addRow(['Versión del Reporte:', '2.0']);
      summarySheet.addRow([]);

      // Estadísticas generales
      summarySheet.addRow(['=== RESUMEN EJECUTIVO ===']);
      summarySheet.addRow(['Tickets Emitidos:', attendees.length]);
      summarySheet.addRow(['Asistentes Confirmados:', attendedCount]);
      summarySheet.addRow(['No se Presentaron:', noShowCount]);
      summarySheet.addRow(['Tasa de Asistencia:', `${attendanceRate}%`]);
      summarySheet.addRow(['Total de Accesos Registrados:', totalScans]);
      summarySheet.addRow([]);

      // Análisis por categoría
      summarySheet.addRow(['=== ANÁLISIS POR CATEGORÍA DE TICKET ===']);
      summarySheet.addRow([]);
      const categoryHeaderRow = summarySheet.addRow(['Categoría', 'Emitidos', 'Asistieron', 'No-Show', 'Tasa %', 'Usos Totales']);
      categoryHeaderRow.font = { bold: true };
      categoryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      categoryHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
      categoryHeaderRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      let totalEmitted = 0, totalAttended = 0, totalNoShow = 0, totalCategoryUses = 0;
      categoryStats.forEach(cat => {
        const row = summarySheet.addRow([cat.name, cat.emitted, cat.attended, cat.noShow, `${cat.rate}%`, cat.totalUses]);
        row.alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'right' };
        row.getCell(4).alignment = { horizontal: 'right' };
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'right' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        totalEmitted += cat.emitted;
        totalAttended += cat.attended;
        totalNoShow += cat.noShow;
        totalCategoryUses += cat.totalUses;
      });

      const totalRate = totalEmitted > 0 ? ((totalAttended / totalEmitted) * 100).toFixed(1) : '0.0';
      const totalRow = summarySheet.addRow(['TOTAL', totalEmitted, totalAttended, totalNoShow, `${totalRate}%`, totalCategoryUses]);
      totalRow.font = { bold: true };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      totalRow.alignment = { horizontal: 'left', vertical: 'middle' };
      totalRow.getCell(2).alignment = { horizontal: 'right' };
      totalRow.getCell(3).alignment = { horizontal: 'right' };
      totalRow.getCell(4).alignment = { horizontal: 'right' };
      totalRow.getCell(5).alignment = { horizontal: 'right' };
      totalRow.getCell(6).alignment = { horizontal: 'right' };
      totalRow.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      summarySheet.addRow([]);

      // Análisis por control
      summarySheet.addRow(['=== ANÁLISIS POR TIPO DE CONTROL ===']);
      summarySheet.addRow([]);
      const controlHeaderRow = summarySheet.addRow(['Tipo de Control', 'Total Usos', '% del Total']);
      controlHeaderRow.font = { bold: true };
      controlHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      controlHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
      controlHeaderRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      let totalControlUses = 0;
      controlStats.forEach(ctrl => {
        const row = summarySheet.addRow([ctrl.name, ctrl.count, `${ctrl.percentage}%`]);
        row.alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'right' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        totalControlUses += ctrl.count;
      });

      const controlTotalRow = summarySheet.addRow(['TOTAL', totalControlUses, '100.0%']);
      controlTotalRow.font = { bold: true };
      controlTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      controlTotalRow.alignment = { horizontal: 'left', vertical: 'middle' };
      controlTotalRow.getCell(2).alignment = { horizontal: 'right' };
      controlTotalRow.getCell(3).alignment = { horizontal: 'right' };
      controlTotalRow.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      summarySheet.addRow([]);

      // Indicadores de operación
      summarySheet.addRow(['=== INDICADORES DE OPERACIÓN ===']);
      summarySheet.addRow(['Primera Entrada Registrada:', firstEntry ? firstEntry.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A']);
      summarySheet.addRow(['Última Entrada Registrada:', lastEntry ? lastEntry.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A']);
      summarySheet.addRow(['Hora Pico de Actividad:', peakHour]);
      summarySheet.addRow(['Promedio de Usos por Asistente:', avgUsesPerPerson]);
      summarySheet.addRow([]);

      // Notas al pie
      summarySheet.addRow(['NOTAS:']);
      summarySheet.addRow(['* Tasa de asistencia = (Asistentes confirmados / Tickets emitidos) × 100']);
      summarySheet.addRow(['* Un asistente puede tener múltiples usos si accedió a diferentes áreas']);
      summarySheet.addRow(['* Hora pico calculada en franjas de 60 minutos']);

      // Estilo del título principal
      summarySheet.getRow(1).font = { size: 16, bold: true, color: { argb: 'FF000000' } };
      summarySheet.getRow(10).font = { bold: true, size: 12 };
      summarySheet.getRow(18).font = { bold: true, size: 12 };
      const indicadoresRowNum = summarySheet.lastRow!.number - 5;
      summarySheet.getRow(indicadoresRowNum).font = { bold: true, size: 12 };

      // ========== HOJA 2: ASISTENTES ==========
      const attendeesSheet = workbook.addWorksheet('ASISTENTES');
      attendeesSheet.columns = [
        { header: '¿ASISTIÓ?', key: 'asistio', width: 12 },
        { header: 'Total Usos', key: 'totalUsos', width: 12 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Categoría', key: 'categoria', width: 18 },
        { header: 'Código QR', key: 'qrCode', width: 30 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Primera Entrada', key: 'primeraEntrada', width: 15 },
        { header: 'Última Entrada', key: 'ultimaEntrada', width: 15 },
        { header: 'Controles Usados', key: 'controlesUsados', width: 35 },
        { header: 'Fecha de Uso', key: 'fechaUso', width: 15 },
        { header: 'Hora de Uso', key: 'horaUso', width: 12 },
        { header: 'Tipo de Acceso', key: 'tipoAcceso', width: 20 },
        { header: 'Dispositivo', key: 'dispositivo', width: 15 },
        { header: 'Notas', key: 'notas', width: 25 }
      ];

      // Ordenar por categoría y luego por nombre
      const sortedAttendees = [...attendees].sort((a, b) => {
        const catA = a.ticket_category?.name || '';
        const catB = b.ticket_category?.name || '';
        if (catA !== catB) return catA.localeCompare(catB);
        return a.name.localeCompare(b.name);
      });

      sortedAttendees.forEach(attendee => {
        const attendeeUsage = controlUsage.filter(u => u.attendee_id === attendee.id);
        const hasUsage = attendeeUsage.length > 0;

        if (!hasUsage) {
          // Sin registros de uso
          const row = attendeesSheet.addRow({
            asistio: 'NO',
            totalUsos: 0,
            nombre: attendee.name,
            cedula: attendee.cedula || 'N/A',
            categoria: attendee.ticket_category?.name || 'N/A',
            qrCode: attendee.qr_code || 'No generado',
            estado: attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado',
            primeraEntrada: 'Sin registros',
            ultimaEntrada: 'Sin registros',
            controlesUsados: 'Sin registros',
            fechaUso: 'Sin registros',
            horaUso: 'Sin registros',
            tipoAcceso: 'Sin registros',
            dispositivo: 'Sin registros',
            notas: 'Sin registros'
          });
          row.getCell('asistio').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
          row.getCell('asistio').font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else {
          // Calcular primera y última entrada
          const usageTimes = attendeeUsage.map(u => new Date(u.used_at)).filter(d => !isNaN(d.getTime()));
          const firstTime = usageTimes.length > 0 ? new Date(Math.min(...usageTimes.map(d => d.getTime()))) : null;
          const lastTime = usageTimes.length > 0 ? new Date(Math.max(...usageTimes.map(d => d.getTime()))) : null;
          
          // Lista única de controles usados
          const uniqueControls = [...new Set(attendeeUsage.map(u => u.control_type?.name || 'N/A'))].join(', ');

          // Primera fila con datos generales
          const firstUsage = attendeeUsage[0];
          const firstDate = new Date(firstUsage.used_at);
          const firstRow = attendeesSheet.addRow({
            asistio: 'SÍ',
            totalUsos: attendeeUsage.length,
            nombre: attendee.name,
            cedula: attendee.cedula || 'N/A',
            categoria: attendee.ticket_category?.name || 'N/A',
            qrCode: attendee.qr_code || 'No generado',
            estado: attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado',
            primeraEntrada: firstTime ? firstTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
            ultimaEntrada: lastTime ? lastTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
            controlesUsados: uniqueControls,
            fechaUso: !isNaN(firstDate.getTime()) ? firstDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A',
            horaUso: !isNaN(firstDate.getTime()) ? firstDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
            tipoAcceso: firstUsage.control_type?.name || 'N/A',
            dispositivo: firstUsage.device || 'N/A',
            notas: firstUsage.notes || 'Sin notas'
          });
          firstRow.getCell('asistio').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
          firstRow.getCell('asistio').font = { bold: true };

          // Filas adicionales para múltiples usos (si existen)
          for (let i = 1; i < attendeeUsage.length; i++) {
            const usage = attendeeUsage[i];
            const usageDate = new Date(usage.used_at);
            attendeesSheet.addRow({
              asistio: '',
              totalUsos: '',
              nombre: '',
              cedula: '',
              categoria: '',
              qrCode: '',
              estado: '',
              primeraEntrada: '',
              ultimaEntrada: '',
              controlesUsados: '',
              fechaUso: !isNaN(usageDate.getTime()) ? usageDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A',
              horaUso: !isNaN(usageDate.getTime()) ? usageDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
              tipoAcceso: usage.control_type?.name || 'N/A',
              dispositivo: usage.device || 'N/A',
              notas: usage.notes || 'Sin notas'
            });
          }
        }
      });

      // Formato de headers
      const attendeesHeaderRow = attendeesSheet.getRow(1);
      attendeesHeaderRow.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      attendeesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      attendeesHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
      attendeesHeaderRow.height = 20;

      // Congelar primera fila y aplicar filtros
      attendeesSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
      attendeesSheet.autoFilter = { from: 'A1', to: 'O1' };

      // Bordes para todas las celdas
      attendeesSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          });
        }
      });

      // ========== HOJA 3: NO ASISTIERON ==========
      const noShowSheet = workbook.addWorksheet('NO ASISTIERON');
      noShowSheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Ticket ID', key: 'ticketId', width: 25 },
        { header: 'Estado', key: 'estado', width: 15 }
      ];

      const noShowAttendees = attendees.filter(a => !uniqueAttendees.has(a.id))
        .sort((a, b) => {
          const catA = a.ticket_category?.name || '';
          const catB = b.ticket_category?.name || '';
          if (catA !== catB) return catA.localeCompare(catB);
          return a.name.localeCompare(b.name);
        });

      noShowAttendees.forEach(attendee => {
        noShowSheet.addRow({
          nombre: attendee.name,
          cedula: attendee.cedula || 'N/A',
          categoria: attendee.ticket_category?.name || 'N/A',
          ticketId: attendee.ticket_id,
          estado: attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado'
        });
      });

      const noShowHeaderRow = noShowSheet.getRow(1);
      noShowHeaderRow.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      noShowHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      noShowHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
      noShowSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
      noShowSheet.autoFilter = { from: 'A1', to: 'E1' };

      noShowSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          });
        }
      });

      // ========== HOJA 4: ANÁLISIS POR CATEGORÍA ==========
      const categoryAnalysisSheet = workbook.addWorksheet('ANÁLISIS POR CATEGORÍA');
      categoryAnalysisSheet.columns = [
        { header: 'Categoría', key: 'categoria', width: 25 },
        { header: 'Tickets Emitidos', key: 'emitidos', width: 18 },
        { header: 'Asistieron', key: 'asistieron', width: 15 },
        { header: 'No Asistieron', key: 'noAsistieron', width: 15 },
        { header: 'Tasa de Asistencia (%)', key: 'tasa', width: 20 },
        { header: 'Total de Usos', key: 'totalUsos', width: 15 },
        { header: 'Promedio Usos/Persona', key: 'promedio', width: 22 },
        { header: 'Control Más Usado', key: 'controlMasUsado', width: 25 },
        { header: 'Usos en Control Principal', key: 'usosControlPrincipal', width: 25 }
      ];

      let totalEmit = 0, totalAtt = 0, totalNoAtt = 0, totalUse = 0;
      categoryStats.forEach(cat => {
        // Encontrar control más usado para esta categoría
        const categoryAttendeeIds = attendees.filter(a => a.ticket_category?.name === cat.name).map(a => a.id);
        const categoryUsage = controlUsage.filter(u => categoryAttendeeIds.includes(u.attendee_id));
        
        const controlCounts = new Map<string, number>();
        categoryUsage.forEach(u => {
          const controlName = u.control_type?.name || 'N/A';
          controlCounts.set(controlName, (controlCounts.get(controlName) || 0) + 1);
        });

        let mostUsedControl = 'N/A';
        let mostUsedCount = 0;
        controlCounts.forEach((count, controlName) => {
          if (count > mostUsedCount) {
            mostUsedCount = count;
            mostUsedControl = controlName;
          }
        });

        const avgUses = cat.attended > 0 ? (cat.totalUses / cat.attended).toFixed(1) : '0.0';

        const row = categoryAnalysisSheet.addRow({
          categoria: cat.name,
          emitidos: cat.emitted,
          asistieron: cat.attended,
          noAsistieron: cat.noShow,
          tasa: `${cat.rate}%`,
          totalUsos: cat.totalUses,
          promedio: avgUses,
          controlMasUsado: mostUsedControl,
          usosControlPrincipal: mostUsedCount
        });

        row.alignment = { horizontal: 'left', vertical: 'middle' };
        [2, 3, 4, 5, 6, 7, 9].forEach(colNum => {
          row.getCell(colNum).alignment = { horizontal: 'right' };
        });

        totalEmit += cat.emitted;
        totalAtt += cat.attended;
        totalNoAtt += cat.noShow;
        totalUse += cat.totalUses;
      });

      const catTotalRate = totalEmit > 0 ? ((totalAtt / totalEmit) * 100).toFixed(1) : '0.0';
      const catAvgTotal = totalAtt > 0 ? (totalUse / totalAtt).toFixed(1) : '0.0';
      const catTotalRow = categoryAnalysisSheet.addRow({
        categoria: 'TOTALES',
        emitidos: totalEmit,
        asistieron: totalAtt,
        noAsistieron: totalNoAtt,
        tasa: `${catTotalRate}%`,
        totalUsos: totalUse,
        promedio: catAvgTotal,
        controlMasUsado: '-',
        usosControlPrincipal: '-'
      });

      catTotalRow.font = { bold: true };
      catTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      catTotalRow.alignment = { horizontal: 'left', vertical: 'middle' };
      [2, 3, 4, 5, 6, 7, 9].forEach(colNum => {
        catTotalRow.getCell(colNum).alignment = { horizontal: 'right' };
      });
      catTotalRow.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' }
      };

      const catHeaderRow = categoryAnalysisSheet.getRow(1);
      catHeaderRow.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      catHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      catHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      catHeaderRow.height = 30;

      categoryAnalysisSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
      categoryAnalysisSheet.autoFilter = { from: 'A1', to: 'I1' };

      categoryAnalysisSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          });
        }
      });

      // ========== HOJA 5: ACTIVIDAD POR HORA ==========
      const hourlySheet = workbook.addWorksheet('ACTIVIDAD POR HORA');
      hourlySheet.columns = [
        { header: 'Hora', key: 'hora', width: 12 },
        { header: 'Total Escaneos', key: 'totalEscaneos', width: 18 },
        { header: 'Asistentes Únicos', key: 'asistentesUnicos', width: 20 },
        { header: '% del Total de Escaneos', key: 'porcentaje', width: 22 },
        { header: 'Acumulado de Escaneos', key: 'acumuladoEscaneos', width: 22 },
        { header: 'Acumulado de Asistentes', key: 'acumuladoAsistentes', width: 25 }
      ];

      // Información inicial
      hourlySheet.insertRow(1, ['DISTRIBUCIÓN TEMPORAL DE ACCESOS']);
      hourlySheet.insertRow(2, ['Fecha del Evento:', event?.event_date || 'N/A']);
      hourlySheet.insertRow(3, []);
      hourlySheet.insertRow(4, ['Primera entrada:', firstEntry ? firstEntry.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A']);
      hourlySheet.insertRow(5, ['Última entrada:', lastEntry ? lastEntry.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A']);
      hourlySheet.insertRow(6, ['Hora pico:', `${peakHour} con ${peakScans} escaneos`]);
      hourlySheet.insertRow(7, []);

      // Headers en la fila 8
      const hourlyHeaderRow = hourlySheet.getRow(8);
      hourlyHeaderRow.values = ['Hora', 'Total Escaneos', 'Asistentes Únicos', '% del Total de Escaneos', 'Acumulado de Escaneos', 'Acumulado de Asistentes'];
      hourlyHeaderRow.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      hourlyHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      hourlyHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      hourlyHeaderRow.height = 25;

      // Ordenar horas cronológicamente
      const sortedHours = Array.from(hourlyScans.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      let accumulatedScans = 0;
      const accumulatedAttendees = new Set<string>();

      sortedHours.forEach(([hour, data]) => {
        accumulatedScans += data.scans;
        data.uniqueAttendees.forEach(id => accumulatedAttendees.add(id));

        const percentage = totalScans > 0 ? ((data.scans / totalScans) * 100).toFixed(1) : '0.0';
        const row = hourlySheet.addRow({
          hora: hour,
          totalEscaneos: data.scans,
          asistentesUnicos: data.uniqueAttendees.size,
          porcentaje: `${percentage}%`,
          acumuladoEscaneos: accumulatedScans,
          acumuladoAsistentes: accumulatedAttendees.size
        });

        row.alignment = { horizontal: 'left', vertical: 'middle' };
        [2, 3, 4, 5, 6].forEach(colNum => {
          row.getCell(colNum).alignment = { horizontal: 'right' };
        });

        // Resaltar hora pico
        if (hour === peakHour) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
          row.font = { bold: true };
        }
      });

      hourlySheet.getRow(1).font = { size: 14, bold: true };
      hourlySheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 8 }];

      hourlySheet.eachRow((row, rowNumber) => {
        if (rowNumber > 8) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          });
        }
      });

      // ========== GENERAR ARCHIVO ==========
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const eventName = event?.event_name?.replace(/[^a-zA-Z0-9]/g, '') || 'Evento';
      const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const fileName = `Reporte_${eventName}_${fecha}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Reporte Excel Empresarial generado correctamente', {
        description: `${attendedCount} de ${attendees.length} asistentes confirmados (${attendanceRate}% de asistencia)`
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      toast.error('Error al generar el reporte', {
        description: 'Ocurrió un error al exportar los datos. Inténtalo de nuevo.'
      });
    }
  };
  
  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      className="bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
    >
      Exportar a Excel
    </Button>
  );
};

export default ExportButton;
