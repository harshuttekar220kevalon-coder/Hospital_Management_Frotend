import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';
import AdminAppointmentDetails from './Appoiment_Details';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
const relatedId = (value) => (value && typeof value === 'object' ? value.id : value);
const getAppointmentDay = (appointment) => {
  const value = appointment.visit_date_time || appointment.Applied_at;
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};
const getLocalDayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const AdminPatientDetails = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patient, setPatient] = useState(() => {
    if (selectedPatient) return selectedPatient;
    try { return JSON.parse(localStorage.getItem('selectedPatient') || 'null'); } catch { return null; }
  });
  const [hospital, setHospital] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const patientId = patient?.id;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = getLocalDayKey(today);
  const yesterdayKey = getLocalDayKey(yesterday);

  const filteredAppointments = appointments.filter((appointment) => {
    if (appointmentFilter === 'all') return true;
    const day = getAppointmentDay(appointment);
    if (appointmentFilter === 'today') return day === todayKey;
    if (appointmentFilter === 'yesterday') return day === yesterdayKey;
    const st = (appointment.status || '').toLowerCase();
    const cs = (appointment.checkup_status || '').toLowerCase();
    if (appointmentFilter === 'completed') {
      return st === 'completed' || st === 'discharged' || cs === 'done' || cs === 'checkup done';
    }
    if (appointmentFilter === 'pending') {
      return st === 'pending' || st === 'assigned' || st === 'admitted';
    }
    return true;
  });

  const loadDetails = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setError('Patient account is unavailable. Return to the patient list and select an account.');
      return;
    }

    try {
      const patientResponse = await fetch(`${API_BASE_URL}/super-admin/Patients/${patientId}/`);
      if (patientResponse.status === 404) {
        localStorage.removeItem('selectedPatient');
        setSelectedPatient?.(null);
        setCurrentPage?.('admin_patients');
        return;
      }
      if (!patientResponse.ok) throw new Error('Could not load the registered patient account.');

      const freshPatient = await patientResponse.json();
      setPatient(freshPatient);
      setSelectedPatient?.(freshPatient);
      localStorage.setItem('selectedPatient', JSON.stringify(freshPatient));

      let hospitalRef = currentUser?.hospital;
      if (!hospitalRef && currentUser?.email) {
        const adminsResponse = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
        if (adminsResponse?.ok) {
          const admins = asList(await adminsResponse.json());
          const admin = admins.find((item) => (item.email || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim());
          hospitalRef = admin?.hospital;
        }
      }
      if (!hospitalRef) {
        try { hospitalRef = JSON.parse(localStorage.getItem('selectedHospital') || 'null')?.id; } catch { /* Ignore invalid cached hospital data. */ }
      }

      const hospitalId = relatedId(hospitalRef || freshPatient.hospital);
      const [hospitalResponse, doctorsResponse, appointmentsResponse] = await Promise.all([
        hospitalId ? fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalId}/`).catch(() => null) : Promise.resolve(null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null)
      ]);

      const hospitalRecord = hospitalResponse?.ok ? await hospitalResponse.json() : null;
      setHospital(hospitalRecord);
      const doctors = doctorsResponse?.ok ? asList(await doctorsResponse.json()) : [];
      const allAppointments = appointmentsResponse?.ok ? asList(await appointmentsResponse.json()) : [];
      const hospitalName = (hospitalRecord?.Name || hospitalRecord?.name || '').toLowerCase().trim();

      const patientEmail = (freshPatient.email || '').toLowerCase().trim();
      const patientContact = String(freshPatient.contact || freshPatient.phone || '').replace(/\D/g, '').slice(-10);
      const patientName = (freshPatient.name || '').toLowerCase().trim();
      const patientCode = (freshPatient.patient_id || '').toLowerCase().trim();

      const isPatientMatch = (appointment) => {
        if (!appointment) return false;
        const apptEmail = (appointment.email || '').toLowerCase().trim();
        if (patientEmail && apptEmail && apptEmail === patientEmail) return true;

        const apptContact = String(appointment.contact || appointment.phone || '').replace(/\D/g, '').slice(-10);
        if (patientContact && apptContact && patientContact === apptContact) return true;

        const apptPatientId = String(appointment.patient_id || appointment.patient || '').toLowerCase().trim();
        if (patientCode && apptPatientId && (apptPatientId === patientCode || apptPatientId === String(freshPatient.id))) return true;

        const apptName = (appointment.patient_Name || appointment.patient_name || appointment.name || '').toLowerCase().trim();
        if (patientName && apptName && (apptName === patientName || apptName.includes(patientName) || patientName.includes(apptName))) {
          if (!apptEmail || !patientEmail || apptEmail === patientEmail) return true;
        }

        return false;
      };

      const matchedAppointments = allAppointments.filter(isPatientMatch);

      const hospitalFiltered = matchedAppointments.filter((appointment) => {
        if (!hospitalId && !hospitalName) return true;
        let appointmentHospital = appointment.hospital ?? appointment.hospital_id;
        let appointmentHospitalId = relatedId(appointmentHospital);
        let appointmentHospitalName = (appointment.hospital_name || (typeof appointmentHospital === 'object' ? (appointmentHospital.Name || appointmentHospital.name) : '') || '').toLowerCase().trim();

        if (!appointmentHospitalId && !appointmentHospitalName) {
          const doctorId = relatedId(appointment.doctor) || appointment.doctor_id;
          const doctor = doctors.find((item) => Number(item.id) === Number(doctorId));
          const doctorHospitals = Array.isArray(doctor?.hospitals) ? doctor.hospitals : [];
          const doctorHospital = doctorHospitals.find((item) => Number(relatedId(item)) === Number(hospitalId)) || doctor?.hospital || doctorHospitals[0];
          appointmentHospitalId = relatedId(doctorHospital);
          appointmentHospitalName = (doctor?.hospital_name || (typeof doctorHospital === 'object' ? (doctorHospital.Name || doctorHospital.name) : '') || '').toLowerCase().trim();
        }

        if (hospitalId && appointmentHospitalId && Number(appointmentHospitalId) === Number(hospitalId)) return true;
        if (hospitalName && appointmentHospitalName && hospitalName === appointmentHospitalName) return true;
        if (!appointmentHospitalId && !appointmentHospitalName) return true;

        return false;
      });

      const finalAppointments = hospitalFiltered.length > 0 ? hospitalFiltered : matchedAppointments;

      const normalizedAppointments = finalAppointments.map((appointment) => {
        const doctorId = relatedId(appointment.doctor) || appointment.doctor_id;
        const doctor = doctors.find((item) => Number(item.id) === Number(doctorId));
        return {
          ...appointment,
          appointment_id: appointment.appointment_id || appointment.Appoment_id || `APT-${appointment.id}`,
          patient_name: appointment.patient_name || appointment.patient_Name || appointment.name || freshPatient.name || 'Patient',
          hospital_name: appointment.hospital_name || hospitalRecord?.Name || hospitalRecord?.name || '',
          doctor_name: appointment.doctor_name || (typeof appointment.doctor === 'object' ? appointment.doctor.name : '') || doctor?.name || 'Not assigned',
          doctor_specialization: appointment.doctor_specialization || doctor?.specialization || doctor?.specialty || 'General Physician',
          nurse_name: appointment.nurse_name || (typeof appointment.nurse === 'object' ? appointment.nurse.name : '') || (appointment.nurse ? `Nurse #${appointment.nurse}` : 'Unassigned'),
          visit_date_time: appointment.visit_date_time || appointment.Applied_at || appointment.appointment_time || appointment.created_at || '',
          payment_status: appointment.payment_status || appointment.Payment_Status || 'Pending',
          checkup_status: appointment.checkup_status || appointment.consultation_status || 'Pending',
          hospitals_charges: Number(appointment.hospitals_charges ?? appointment.amount ?? 0),
          amount_paid: Number(appointment.amount_paid ?? 0)
        };
      }).sort((a, b) => new Date(b.visit_date_time || 0) - new Date(a.visit_date_time || 0));

      setAppointments(normalizedAppointments);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load patient details.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, patientId, setCurrentPage, setSelectedPatient]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadDetails, 0);
    const interval = window.setInterval(loadDetails, 5000);
    const onFocus = () => loadDetails();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadDetails]);

  if (selectedAppointment) {
    return <AdminAppointmentDetails appointment={selectedAppointment} patient={patient} onBack={() => setSelectedAppointment(null)} />;
  }

  const completedCount = appointments.filter((item) => {
    const st = (item.status || '').toLowerCase();
    const cs = (item.checkup_status || '').toLowerCase();
    return st === 'completed' || st === 'discharged' || cs === 'done' || cs === 'checkup done';
  }).length;

  const pendingCount = appointments.filter((item) => {
    const st = (item.status || '').toLowerCase();
    return st === 'pending' || st === 'assigned' || st === 'admitted';
  }).length;

  const totalCharges = appointments.reduce((sum, item) => sum + (Number(item.hospitals_charges) || 0), 0);

  return (
    <main className="w-full space-y-5 px-4 py-5 sm:px-8 sm:py-8">
      <button type="button" onClick={() => setCurrentPage?.('admin_patients')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
        ← Back to Patients List
      </button>

      <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 p-5 text-white shadow-md sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-200">Registered patient account</p>
        <h1 className="mt-1 text-2xl font-bold">{patient?.name || 'Patient details'}</h1>
        <p className="mt-1 text-sm text-slate-300">Patient ID: {patient?.patient_id || 'Not provided'}</p>
        <p className="mt-1 text-xs text-teal-100">Hospital: {hospital?.Name || hospital?.name || 'Hospital not found'}</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {/* APPOINTMENT METADATA CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{appointments.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Patient Appointments</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completed / Done</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{completedCount}</p>
          <p className="mt-0.5 text-xs text-emerald-600">Consultations Finished</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending / In Progress</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{pendingCount}</p>
          <p className="mt-0.5 text-xs text-amber-600">Active Care / Scheduled</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">Total Billed</p>
          <p className="mt-1 text-2xl font-bold text-sky-800">₹{totalCharges.toFixed(2)}</p>
          <p className="mt-0.5 text-xs text-sky-600">Hospital Charges</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Account registration details</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Name', patient?.name],
            ['Patient ID', patient?.patient_id],
            ['Address', patient?.address],
            ['Contact', patient?.contact],
            ['Email', patient?.email]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || 'Not provided'}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-400">Password is hidden.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Patient Appointments & History</h2>
            <p className="mt-1 text-xs text-slate-500">All registered appointments and consultations booked by this patient.</p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">{appointments.length} total appointment(s)</span>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          {[
            ['all', 'All appointments', appointments.length],
            ['today', 'Today', appointments.filter((item) => getAppointmentDay(item) === todayKey).length],
            ['yesterday', 'Yesterday', appointments.filter((item) => getAppointmentDay(item) === yesterdayKey).length],
            ['completed', 'Completed', completedCount],
            ['pending', 'Pending / Active', pendingCount]
          ].map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setAppointmentFilter(key)} aria-pressed={appointmentFilter === key}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition cursor-pointer ${appointmentFilter === key ? 'border-sky-700 bg-sky-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700'}`}>
              {label}<span className={`ml-2 rounded-full px-2 py-0.5 ${appointmentFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading patient appointments…</div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">No appointments found for this patient.</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">No appointments found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Appointment ID & Date</th>
                  <th className="px-5 py-4">Doctor & Specialty</th>
                  <th className="px-5 py-4">Care Staff & Bed</th>
                  <th className="px-5 py-4">Reason & Checkup</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Billing</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((appointment) => {
                  const visitDate = appointment.visit_date_time ? new Date(appointment.visit_date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not set';
                  const visitTime = appointment.visit_date_time ? new Date(appointment.visit_date_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <tr key={appointment.id} className="transition-colors hover:bg-sky-50/50">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-sky-800">{appointment.appointment_id}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{visitDate} {visitTime && `• ${visitTime}`}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800">{appointment.doctor_name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{appointment.doctor_specialization || 'General Physician'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-700">{appointment.nurse_name || 'Unassigned'}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {appointment.bed_number ? `Bed #${appointment.bed_number} (${appointment.floor || `Floor ${Math.floor((appointment.bed_number - 1) / 100) + 1}`})` : 'Bed: Unassigned'}
                        </span>
                      </td>
                      <td className="max-w-xs px-5 py-4">
                        <span className="block truncate font-medium text-slate-700" title={appointment.symptoms_diagnosis}>{appointment.symptoms_diagnosis || 'General consultation'}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Checkup: <strong className="text-slate-700">{appointment.checkup_status}</strong></span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${
                          appointment.status === 'Completed' || appointment.status === 'Discharged'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : appointment.status === 'Assigned' || appointment.status === 'Admitted'
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : appointment.status === 'Cancelled'
                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}>
                          {appointment.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-semibold text-slate-800">₹{Number(appointment.hospitals_charges || 0).toFixed(2)}</span>
                        <span className={`mt-0.5 inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          appointment.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appointment.payment_status === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {appointment.payment_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => setSelectedAppointment(appointment)} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 font-bold text-sky-700 hover:bg-sky-600 hover:text-white transition cursor-pointer">
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminPatientDetails;
