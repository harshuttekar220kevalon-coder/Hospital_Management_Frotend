import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getAssignedNurseForPatientBed = (bedNumber, nursesList = [], hospitalId = null) => {
  if (!nursesList || !Array.isArray(nursesList) || nursesList.length === 0) {
    return { nurseId: null, nurseName: '' };
  }
  const hospNurses = hospitalId
    ? nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(hospitalId))
    : nursesList;
  const activeNurses = hospNurses.length > 0 ? hospNurses : nursesList;
  if (activeNurses.length === 0) return { nurseId: null, nurseName: '' };
  const first = activeNurses[0];
  return { nurseId: first.id, nurseName: first.name };
};

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const getFloorBedRange = (floor) => {
  if (!floor || isNaN(Number(floor))) {
    return { label: 'Beds 1 - 100', start: 1, end: 100 };
  }
  const f = Number(floor);
  const start = (f - 1) * 100 + 1;
  const end = f * 100;
  return { label: `Beds ${start} - ${end}`, start, end };
};

const AdminPatients = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedHospital }) => {
  const [patients, setPatients] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'];
  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Failed'];
  const paymentMethods = ['Cash', 'UPI', 'Credit Card', 'Net Banking'];

  const initialAddFormState = {
    patient_id: '',
    name: '',
    age: '',
    gender: '',
    blood_group: '',
    contact: '',
    email: '',
    password: '',
    Password: '',
    address: '',
    hospital: '',
    doctor: '',
    bed_number: '',
    nurse: '',
    nurse_name: '',
    consultation_fee: '',
    Hospitals_Chargies: '',
    amount_paid: '',
    payment_status: '',
    payment_method: '',
    symptoms_diagnosis: '',
    Condation: '',
    condation: '',
    condition: '',
    symptoms_severity: '',
    visit_date_time: '',
    status: '',
    is_active: true,
    attached_document: '',
    attached_document_name: ''
  };

  const [addFormData, setAddFormData] = useState(initialAddFormState);
  const [addSelectedFile, setAddSelectedFile] = useState(null);

  const generatePatientId = () => `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

  const fetchAdminPatientsAndDoctors = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      let assignedHospitalId = currentUser?.hospital || null;

      try {
        const adminsRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
        if (adminsRes && adminsRes.ok) {
          const adminsList = await adminsRes.json();
          const currentEmail = (currentUser?.email || '').toLowerCase().trim();
          const matchedAdmin = adminsList.find(a => (a.email || '').toLowerCase().trim() === currentEmail);
          if (matchedAdmin && matchedAdmin.hospital) {
            assignedHospitalId = Number(matchedAdmin.hospital);
          }
        }
      } catch (e) {
        console.error('Error fetching admin record:', e);
      }

      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch {}
      }

      let hosp = null;
      if (assignedHospitalId) {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${assignedHospitalId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      }

      if (!hosp && assignedHospitalId) {
        const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (allHospRes && allHospRes.ok) {
          const allHosp = await allHospRes.json();
          hosp = allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) || null;
        }
      }

      if (hosp) {
        setHospitalData(hosp);
        if (setSelectedHospital) setSelectedHospital(hosp);
      }

      let allHospitalDoctors = [];
      const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
      if (docRes && docRes.ok) {
        const doctorsPayload = await docRes.json();
        allHospitalDoctors = Array.isArray(doctorsPayload) ? doctorsPayload : (doctorsPayload.results || doctorsPayload.data || []);
        const allDocs = allHospitalDoctors;
        if (assignedHospitalId) {
          const branchDocs = allDocs.filter(d => {
            const hospIds = Array.isArray(d.hospitals)
              ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
              : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
            return hospIds.includes(Number(assignedHospitalId));
          });
          setDoctorsList(branchDocs);
        } else {
          setDoctorsList(allDocs);
        }
      }

      const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
      if (nurseRes && nurseRes.ok) {
        const allNurses = await nurseRes.json();
        if (assignedHospitalId) {
          const branchNurses = allNurses.filter(n => {
            const nHospId = Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital);
            return nHospId === Number(assignedHospitalId);
          });
          setNursesList(branchNurses);
        } else {
          setNursesList(allNurses);
        }
      }

      let rawAppointments = [];
      try {
        const apptRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
        if (apptRes && apptRes.ok) {
          rawAppointments = await apptRes.json().catch(() => []);
        }
      } catch (e) {}

      let rawPatients = [];
      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          rawPatients = await patRes.json().catch(() => []);
        }
      } catch (e) {}

      // Admin directory includes registered patients only after they book at this hospital.
      const patientAccounts = Array.isArray(rawPatients) ? rawPatients : (rawPatients?.results || rawPatients?.data || []);
      const appointments = Array.isArray(rawAppointments) ? rawAppointments : (rawAppointments?.results || rawAppointments?.data || []);
      const currentHospName = (hosp?.Name || hosp?.name || '').toLowerCase().trim();
      const accountByEmail = new Map(patientAccounts.filter(patient => patient?.email).map(patient => [patient.email.toLowerCase().trim(), patient]));
      const accountByPhone = new Map(patientAccounts.map(patient => {
        const digits = String(patient?.contact || patient?.phone || '').replace(/\D/g, '');
        return [digits.length >= 10 ? digits.slice(-10) : digits, patient];
      }).filter(([phone]) => phone));

      const appointmentsForHospital = appointments.filter((appointment) => {
        if (!appointment) return false;
        let appointmentHospital = appointment.hospital ?? appointment.hospital_id;
        let hospitalId = typeof appointmentHospital === 'object' ? appointmentHospital?.id : appointmentHospital;
        let hospitalName = appointment.hospital_name || (typeof appointmentHospital === 'object' ? (appointmentHospital?.Name || appointmentHospital?.name) : '');

        // Older bookings may omit hospital, so use their assigned doctor's hospital as a fallback.
        if (!hospitalId && !hospitalName) {
          const doctorId = typeof appointment.doctor === 'object' ? appointment.doctor?.id : (appointment.doctor || appointment.doctor_id);
          const doctor = allHospitalDoctors.find(item => Number(item.id) === Number(doctorId));
          const doctorHospitals = Array.isArray(doctor?.hospitals) ? doctor.hospitals : [];
          const matchingDoctorHospital = doctorHospitals.find(item => Number(typeof item === 'object' ? item.id : item) === Number(assignedHospitalId));
          const doctorHospital = matchingDoctorHospital || doctor?.hospital || doctorHospitals[0];
          hospitalId = typeof doctorHospital === 'object' ? doctorHospital?.id : doctorHospital;
          hospitalName = doctor?.hospital_name || (typeof doctorHospital === 'object' ? (doctorHospital?.Name || doctorHospital?.name) : '');
        }

        if (assignedHospitalId && Number(hospitalId) === Number(assignedHospitalId)) return true;
        return Boolean(currentHospName && hospitalName && hospitalName.toLowerCase().trim() === currentHospName);
      });

      // Appointments only determine eligibility for this hospital's patient directory.
      // Keep the displayed records as the registered patient profiles themselves.
      const hospitalPatientIds = new Set();
      appointmentsForHospital.forEach((appointment) => {
        const email = String(appointment.email || '').toLowerCase().trim();
        const phoneDigits = String(appointment.contact || appointment.phone || '').replace(/\D/g, '');
        const phone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
        const patientRef = typeof appointment.patient === 'object' ? appointment.patient?.id : appointment.patient;
        const account = (email && accountByEmail.get(email)) || (phone && accountByPhone.get(phone)) || patientAccounts.find(patient => patient?.id && String(patient.id) === String(patientRef));
        if (account?.id !== undefined && account?.id !== null) hospitalPatientIds.add(String(account.id));
      });
      setPatients(patientAccounts.filter(patient => hospitalPatientIds.has(String(patient.id))));
    } catch (err) {
      console.error('Error loading patients data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAdminPatientsAndDoctors(false);

    // Auto-polling every 3.5s for real-time status update from backend
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAdminPatientsAndDoctors(true);
      }
    }, 3500);

    const handleFocus = () => {
      if (isMounted) fetchAdminPatientsAndDoctors(true);
    };
    const handleVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') fetchAdminPatientsAndDoctors(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm]);

  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    const selectedDoc = doctorsList.find(d => d.id === Number(docId));
    const fee = selectedDoc ? (selectedDoc.consultation_fee ?? 0.00) : 0.00;
    const hospCharge = Number(addFormData.Hospitals_Chargies) || 0.00;
    const totalAmount = fee + hospCharge;

    setAddFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: totalAmount
    }));
  };

  const handleHospitalChargesChange = (e) => {
    const hospCharge = parseFloat(e.target.value) || 0.00;
    const fee = Number(addFormData.consultation_fee) || 0.00;
    const totalAmount = fee + hospCharge;
    setAddFormData(prev => ({
      ...prev,
      Hospitals_Chargies: e.target.value,
      amount_paid: totalAmount
    }));
  };

  const handleOpenAddModal = () => {
    setAddSelectedFile(null);
    setAddFormData({
      ...initialAddFormState,
      patient_id: ''
    });
    setIsAddModalOpen(true);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      alert('Registration Incomplete:\nPlease enter the patient\'s full legal name before submitting.');
      return;
    }

    const cleanPhone = (addFormData.contact || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (addFormData.email && !addFormData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }

    try {
      const generatedDocPatId = generatePatientId();
      const selectedDocObj = doctorsList.find(d => d.id === Number(addFormData.doctor));
      const hospId = Number(hospitalData?.id || currentUser?.hospital || 1);
      const selectedNurseObj = nursesList.find(n => n.id === Number(addFormData.nurse));
      const autoNurse = getAssignedNurseForPatientBed(addFormData.bed_number, nursesList, hospId);
      const finalNurseId = addFormData.nurse ? Number(addFormData.nurse) : (autoNurse?.nurseId || null);
      const finalNurseName = selectedNurseObj ? selectedNurseObj.name : (addFormData.nurse_name || autoNurse?.nurseName || '');

      let response;

      const chosenCondition = addFormData.Condation || addFormData.condation || addFormData.condition || addFormData.symptoms_severity || 'Normal';
      const parsedBedNum = addFormData.bed_number ? Number(addFormData.bed_number) : null;

      const payloadData = {
        patient_id: generatedDocPatId,
        name: addFormData.name.trim(),
        contact: cleanPhone,
        email: (addFormData.email || '').trim(),
        password: (addFormData.password || addFormData.Password || '').trim(),
        Password: (addFormData.password || addFormData.Password || '').trim(),
        age: addFormData.age ? Number(addFormData.age) : null,
        gender: addFormData.gender || addFormData.Gender || '',
        Gender: addFormData.gender || addFormData.Gender || '',
        patient_gender: addFormData.gender || addFormData.Gender || '',
        blood_group: addFormData.blood_group,
        Blood_Group: addFormData.blood_group,
        address: (addFormData.address || '').trim(),
        hospital: hospId,
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : '',
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        bed_number: parsedBedNum,
        nurse: finalNurseId,
        nurse_name: finalNurseName,
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(addFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(addFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: addFormData.payment_status || 'Pending',
        payment_method: addFormData.payment_method,
        symptoms_diagnosis: addFormData.symptoms_diagnosis,
        Condation: chosenCondition,
        condation: chosenCondition,
        condition: chosenCondition,
        Condition: chosenCondition,
        symptoms_severity: chosenCondition,
        visit_date_time: addFormData.visit_date_time || null,
        status: addFormData.status || 'Pending',
        is_active: Boolean(addFormData.is_active)
      };

      if (addSelectedFile instanceof File) {
        const formData = new FormData();
        Object.keys(payloadData).forEach(key => {
          if (payloadData[key] !== null && payloadData[key] !== undefined) {
            formData.append(key, payloadData[key]);
          }
        });
        formData.append('attached_document', addSelectedFile);

        response = await fetch(`${API_BASE_URL}/super-admin/Patients/`, {
          method: 'POST',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const resData = await response.json().catch(() => ({}));
        const createdId = resData.patient_id || generatedDocPatId;
        const successMsg = resData.message || `Patient ${addFormData.name} registered successfully! (UHID: ${createdId})`;
        alert(successMsg);
        setAddSelectedFile(null);
        setIsAddModalOpen(false);
        fetchAdminPatientsAndDoctors();
      } else {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        let errMsg = errorData.message || errorData.detail || errorData.error;
        if (!errMsg && typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to register patient in hospital database.');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.message || 'Error registering patient with hospital network.');
    }
  };

  const handleViewPatientDetails = (pat) => {
    if (setSelectedPatient) {
      setSelectedPatient(pat);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(pat));
    if (setCurrentPage) {
      setCurrentPage('admin_patient_details');
    }
  };

  const filteredPatients = patients.filter(pat => {
    const term = searchTerm.toLowerCase();
    const fullName = (pat.name || '').toLowerCase();
    const patientId = String(pat.patient_id || pat.id || '').toLowerCase();
    const contact = (pat.contact || pat.phone || '').toLowerCase();
    const email = (pat.email || '').toLowerCase();
    const address = (pat.address || '').toLowerCase();
    return fullName.includes(term) || patientId.includes(term) || contact.includes(term) || email.includes(term) || address.includes(term);
  });

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {hospitalData?.Name || 'Branch Hospital'} • In-Patient & OPD Directory
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Patients Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Registered patient profiles linked to this hospital.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              + Register New Patient
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-sm font-semibold text-slate-700">{patients.length} registered patient profile(s) linked to this hospital</p>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search patient name, ID, phone, email, address..."
          className="w-full sm:w-96 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold text-slate-500">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No patients found matching criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Patient Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[650px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3">Patient Name & ID</th>
                  <th className="py-3.5 px-3">Contact</th>
                  <th className="py-3.5 px-3">Email</th>
                  <th className="py-3.5 px-3">Address</th>
                  <th className="py-3.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.slice(0, visibleCount).map((pat) => {
                  const emailLower = (pat.email || '').toLowerCase();
                  return (
                    <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">{pat.name || 'Patient'}</div>
                        <span className="font-mono text-[10px] font-bold text-teal-700">{pat.patient_id || `PAT-${pat.id}`}</span>
                      </td>
                      <td className="py-3.5 px-4">{pat.contact || pat.phone || '-'}</td>
                      <td className="py-3.5 px-4">{emailLower ? <a href={`mailto:${emailLower}`} className="text-sky-700 hover:underline">{emailLower}</a> : '-'}</td>
                      <td className="py-3.5 px-4">{pat.address || '-'}</td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(pat)}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {visibleCount < filteredPatients.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Patient</h2>
                <p className="text-xs text-slate-500">Add a patient profile for this hospital.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 35"
                    value={addFormData.age}
                    onChange={(e) => setAddFormData({ ...addFormData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={addFormData.gender}
                    onChange={(e) => setAddFormData({ ...addFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    value={addFormData.blood_group}
                    onChange={(e) => setAddFormData({ ...addFormData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Blood Group --</option>
                    {bloodGroups.map((bg, idx) => (
                      <option key={idx} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    placeholder="e.g. 9876543210"
                    value={addFormData.contact}
                    onChange={(e) => setAddFormData({ ...addFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                    title="Email must be a valid @gmail.com address"
                    placeholder="patient@gmail.com"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Enter patient full address..."
                  value={addFormData.address}
                  onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={hospitalData?.Name || 'Assigned Hospital'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Assigned Doctor ({doctorsList.length} available) *
                  </label>
                    <select
                    required
                    value={addFormData.doctor}
                    onChange={handleDoctorChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Doctor ({doctorsList.length} Available) --</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || d.specialty || 'Doctor'}) [₹{d.consultation_fee ?? 0}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BED & FLOOR ALLOCATION & NURSE CARE SECTION */}
              {(() => {
                const hospId = Number(hospitalData?.id || currentUser?.hospital || 1);
                const hospActiveNurses = nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === hospId);
                const currentBed = addFormData.bed_number ? Number(addFormData.bed_number) : null;
                const floorDisplay = currentBed ? `Floor ${Math.floor((currentBed - 1) / 100) + 1}` : 'Not Assigned';

                return (
                  <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sky-900 uppercase text-[11px]">Bed & Floor Allocation</p>
                      </div>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full border border-sky-200">
                        {floorDisplay}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Bed Number
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 45 or 150"
                          value={addFormData.bed_number}
                          onChange={(e) => {
                            const bedVal = e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : '';
                            setAddFormData(prev => ({
                              ...prev,
                              bed_number: bedVal
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-sky-600 shadow-2xs"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {currentBed ? `Allocated: Bed #${currentBed} • ${floorDisplay}` : 'Enter patient bed number'}
                        </p>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Assigned Nurse ({hospActiveNurses.length} active in branch)
                        </label>
                        <select
                          value={addFormData.nurse}
                          onChange={(e) => {
                            const nId = e.target.value;
                            const selNurse = nursesList.find(n => n.id === Number(nId));
                            setAddFormData(prev => ({
                              ...prev,
                              nurse: nId,
                              nurse_name: selNurse ? selNurse.name : ''
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Select Nurse --</option>
                          {hospActiveNurses.map(n => (
                            <option key={n.id} value={n.id}>
                              {n.name} ({n.ward || 'Staff Nurse'}) - Shift: {n.shift || 'General'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Floor Bed Info Banner */}
                    {currentBed && (
                      <div className="p-2.5 bg-white rounded-lg border border-sky-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-semibold text-sky-900">
                          {floorDisplay} Allocation:
                        </span>
                        <span className="text-slate-600 font-mono">
                          Floor Range: {getFloorBedRange(getFloorNumber(currentBed)).label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-900 uppercase text-[11px] tracking-wide">
                    Payment, Doctor Fee & Hospital Charges
                  </p>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Dual Billing Model
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">
                      Doctor Consultation Fee (₹) <span className="text-[10px] text-amber-700 font-normal">(Doctor Set)</span> *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      readOnly
                      value={addFormData.consultation_fee}
                      placeholder="Doctor fee"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono font-bold focus:outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Fixed consultation fee set on Doctor profile</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges / Services (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addFormData.Hospitals_Chargies}
                      onChange={handleHospitalChargesChange}
                      placeholder="e.g. 350.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Credited to Hospital Revenue</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Bill Breakdown:</span>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      Doctor: ₹{Number(addFormData.consultation_fee || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      Hospital: ₹{Number(addFormData.Hospitals_Chargies || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-600 uppercase mr-1.5">Total Amount:</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      ₹{(Number(addFormData.consultation_fee || 0) + Number(addFormData.Hospitals_Chargies || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 500.00"
                      value={addFormData.amount_paid}
                      onChange={(e) => setAddFormData({ ...addFormData, amount_paid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                    <select
                      value={addFormData.payment_status}
                      onChange={(e) => setAddFormData({ ...addFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold cursor-pointer"
                    >
                      <option value="">-- Select Payment Status --</option>
                      {paymentStatuses.map((ps, idx) => (
                        <option key={idx} value={ps}>{ps}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
                    <select
                      value={addFormData.payment_method}
                      onChange={(e) => setAddFormData({ ...addFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium cursor-pointer"
                    >
                      <option value="">-- Select Payment Method --</option>
                      {paymentMethods.map((pm, idx) => (
                        <option key={idx} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  rows={2}
                  placeholder="Describe patient's chief complaints..."
                  value={addFormData.symptoms_diagnosis}
                  onChange={(e) => setAddFormData({ ...addFormData, symptoms_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Condition (Triage) *</label>
                  <select
                    value={addFormData.Condation || ''}
                    onChange={(e) => setAddFormData({
                      ...addFormData,
                      Condation: e.target.value,
                      condation: e.target.value,
                      condition: e.target.value,
                      symptoms_severity: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-teal-600 focus:bg-white cursor-pointer"
                  >
                    <option value="">-- Select Condition --</option>
                    <option value="Critical">Critical</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Scheduled Visit Date & Time</label>
                  <input
                    type="datetime-local"
                    value={addFormData.visit_date_time}
                    onChange={(e) => setAddFormData({ ...addFormData, visit_date_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select Status --</option>
                    {statusOptions.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;
