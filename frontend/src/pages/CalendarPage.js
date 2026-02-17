// src/pages/CalendarPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import apiClient from '../api';
import '../Calendar.css'; // Estilos para el calendario

function CalendarPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await apiClient.get('/api/meetings');
      setMeetings(response.data);
    } catch (err) {
      setError('No se pudo cargar el historial de reuniones.');
    }
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.fecha_creacion);
        return (
          meetingDate.getDate() === date.getDate() &&
          meetingDate.getMonth() === date.getMonth() &&
          meetingDate.getFullYear() === date.getFullYear()
        );
      });

      if (dayMeetings.length > 0) {
        return (
          <div className="flex justify-center items-center">
            {dayMeetings.map(meeting => (
              <div key={meeting.id} className="w-2 h-2 bg-amber-500 rounded-full mx-px"></div>
            ))}
          </div>
        );
      }
    }
    return null;
  };

  const dayMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.fecha_creacion);
    return (
      meetingDate.getDate() === date.getDate() &&
      meetingDate.getMonth() === date.getMonth() &&
      meetingDate.getFullYear() === date.getFullYear()
    );
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-amber-400">Bee-Scribe</h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
            ← Volver a Inicio
          </button>
        </div>
      </nav>
      <main className="container mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-amber-400 pb-3 mb-6">
          Calendario de Resúmenes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Calendar
              onChange={handleDateChange}
              value={date}
              tileContent={tileContent}
              className="react-calendar"
            />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              Resúmenes para {date.toLocaleDateString()}
            </h3>
            {dayMeetings.length > 0 ? (
              <ul className="space-y-4">
                {dayMeetings.map(meeting => (
                  <li
                    key={meeting.id}
                    onClick={() => navigate(`/results/${meeting.id}`)}
                    className="p-4 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-100 border"
                  >
                    <strong className="block text-sm font-medium text-amber-600">{meeting.titulo}</strong>
                    <span className="block text-xs text-gray-500">{new Date(meeting.fecha_creacion).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500">No hay resúmenes para este día.</p>
            )}
          </div>
        </div>
        {error && <div className="mt-8 max-w-3xl mx-auto p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">{error}</div>}
      </main>
    </div>
  );
}

export default CalendarPage;
