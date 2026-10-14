import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getId = (value) => (value && typeof value === 'object' ? value.id : value);
const display = (value) => (value === null || value === undefined || value === '' ? 'Not provided' : value);
const formatDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleString();
};
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const AdminAppointmentDetails = ({ appointment, onBack }) => {
  const [record, setRecord] = useState(appointment || null);
  const [related, setRelated] = useState({ hospital: null, doctor: null, nurse: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchAppointment = useCallback(async () => {
    const appointmentId = getId(appointment?.id);
    if (!appointmentId) {
      setLoadError('Appointment ID is unavailable.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/appointments/${appointmentId}/`);
      if (!response.ok) throw new Error(response.status === 404 ? 'This appointment could not be found.' : 'Could not load appointment details.');
      const latest = await response.json();
      setRecord(latest);

      const relatedEntries = [
        ['hospital', 'Hospital', latest.hospital],
        ['doctor', 'Doctors', latest.doctor],
        ['nurse', 'Nurses', latest.nurse]
      ];
      const relatedValues = await Promise.all(relatedEntries.map(async ([key, endpoint, value]) => {
        const id = getId(value);
        if (!id) return [key, null];
        try {
          const relatedResponse = await fetch(`${API_BASE_URL}/super-admin/${endpoint}/${id}/`);
          return [key, relatedResponse.ok ? await relatedResponse.json() : null];
        } catch {
          return [key, null];
        }
      }));
      setRelated(Object.fromEntries(relatedValues));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Could not load appointment details.');
    } finally {
      setLoading(false);
    }
  }, [appointment?.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchAppointment, 0);
    const interval = window.setInterval(fetchAppointment, 5000);
    const onFocus = () => fetchAppointment();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAppointment]);

  const appt = record || appointment || {};
  const appointmentDate = appt.visit_date_time;
  const fields = [
    ['Patient', appt.patient_Name],
    ['Hospital', related.hospital?.Name],
    ['Doctor', related.doctor?.name],
    ['Nurse', related.nurse?.name],
    ['Appointment date & time', formatDate(appointmentDate)],
    ['Appointment applied at', formatDate(appt.Applied_at)],
    ['Age', appt.age],
    ['Symptoms / diagnosis', appt.symptoms_diagnosis],
    ['Blood group', appt.blood_group],
    ['Contact', appt.contact],
    ['Email', appt.email],
    ['Gender', appt.Gender],
    ['Address', appt.address],
    ['Checkup status', appt.checkup_status],
    ['Hospital charges', money(appt.hospitals_charges)],
    ['Amount paid', money(appt.amount_paid)],
    ['Payment status', appt.payment_status],
    ['Payment method', appt.payment_method],
    ['Appointment status', appt.status],
    ['Condition', appt.condition],
    ['Bed number', appt.bed_number],
    ['Discharge date & time', formatDate(appt.Discharge_DateTime)]
  ];

  const processItems = [
    ['Appointment applied', formatDate(appt.Applied_at), Boolean(appt.Applied_at)],
    ['Doctor assigned', display(related.doctor?.name), Boolean(appt.doctor)],
    ['Checkup', display(appt.checkup_status), appt.checkup_status === 'Checkup Done'],
    ['Appointment status', display(appt.status), Boolean(appt.status && appt.status !== 'Pending')],
    ['Discharged', formatDate(appt.Discharge_DateTime), Boolean(appt.Discharge_DateTime)]
  ];

  return (
    <main className="min-h-screen w-full space-y-5 bg-slate-50 px-4 py-5 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
          ← Back to patient appointments
        </button>
        <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 font-mono text-sm font-bold text-sky-800">
          Appointment {display(appt.Appoment_id)}
        </span>
      </div>

      <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 p-5 text-white shadow-md sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-200">Appointment details</p>
        <h1 className="mt-1 text-2xl font-bold">{display(appt.patient_Name)}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1">Appointment: {display(appt.status)}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">Checkup: {display(appt.checkup_status)}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">Payment: {display(appt.payment_status)}</span>
          {loading && <span className="text-xs text-teal-100">Refreshing appointment data…</span>}
        </div>
      </header>

      {loadError && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{loadError}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Appointment process</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {processItems.map(([label, detail, done], index) => (
            <div key={label} className={`rounded-xl border p-4 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
              <p className="mt-1 font-bold text-slate-800">{label}</p>
              <p className={`mt-1 text-sm ${done ? 'text-emerald-800' : 'text-slate-500'}`}>{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Appointment record</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{display(value)}</p>
            </div>
          ))}
        </div>
        {appt.attached_document && (
          <a className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700" href={appt.attached_document} target="_blank" rel="noreferrer">
            Open attached document
          </a>
        )}
      </section>
    </main>
  );
};

export default AdminAppointmentDetails;
