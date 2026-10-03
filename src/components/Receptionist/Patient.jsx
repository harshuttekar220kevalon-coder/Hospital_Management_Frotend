import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const ReceptionistPatient = ({ currentUser, setCurrentPage, setSelectedPatient, selectedDoctorForPatient }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSelectedFile, setAddSelectedFile] = useState(null);

  const generateUHID = () => `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

  const userHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : 1);

  const initialFormState = {
    patient_id: '',
    name: '',
    age: '',
    gender: 'Male',
    blood_group: 'B+',
    contact: '',
    email: '',
    address: '',
    hospital: userHospId || 1,
    doctor: selectedDoctorForPatient?.id || '',
    bed_number: '',
    nurse: '',
    consultation_fee: selectedDoctorForPatient?.consultation_fee || '500',
    Hospitals_Chargies: '1500',
    amount_paid: '2000',
    payment_status: 'Paid',
    payment_method: 'Cash',
    symptoms_diagnosis: '',
    Condation: 'Normal',
    status: 'Admitted',
    is_active: true
  };

  const [addFormData, setAddFormData] = useState(initialFormState);

  useEffect(() => {
    fetchAllData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedDoctorForPatient) {
      setAddFormData(prev => ({
        ...prev,
        doctor: selectedDoctorForPatient.id,
        consultation_fee: selectedDoctorForPatient.consultation_fee || '500',
        hospital: typeof selectedDoctorForPatient.hospital === 'object' ? selectedDoctorForPatient.hospital?.id : (selectedDoctorForPatient.hospital || prev.hospital)
      }));
      setIsAddModalOpen(true);
    }
  }, [selectedDoctorForPatient]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [patRes, docRes, hospRes, nurRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
      ]);

      let patData = [];
      let docData = [];
      let hospData = [];
      let nurData = [];

      if (patRes.status === 'fulfilled' && patRes.value.ok) patData = await patRes.value.json().catch(() => []);
      if (docRes.status === 'fulfilled' && docRes.value.ok) docData = await docRes.value.json().catch(() => []);
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) hospData = await hospRes.value.json().catch(() => []);
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) nurData = await nurRes.value.json().catch(() => []);

      setHospitals(Array.isArray(hospData) ? hospData : []);
      setDoctors(Array.isArray(docData) ? docData : []);
      setNurses(Array.isArray(nurData) ? nurData : []);

      // If receptionist belongs to a specific hospital, filter
      const targetHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
      const filteredPats = targetHospId && Array.isArray(patData)
        ? patData.filter(p => Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital) === Number(targetHospId))
        : (Array.isArray(patData) ? patData : []);

      setPatients(filteredPats);
    } catch (err) {
      console.error('Error fetching receptionist patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setAddFormData({
      ...initialFormState,
      patient_id: generateUHID(),
      hospital: userHospId || (hospitals[0]?.id || 1)
    });
    setAddSelectedFile(null);
    setIsAddModalOpen(true);
  };

  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'doctor') {
      const docObj = doctors.find(d => Number(d.id) === Number(value));
      setAddFormData(prev => ({
        ...prev,
        doctor: value,
        consultation_fee: docObj?.consultation_fee || prev.consultation_fee
      }));
    } else {
      setAddFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!addFormData.name.trim()) {
      alert('Please enter patient name.');
      return;
    }

    try {
      const generatedDocPatId = addFormData.patient_id || generateUHID();
      const selectedDocObj = doctors.find(d => Number(d.id) === Number(addFormData.doctor));
      const chosenHospId = Number(addFormData.hospital || userHospId || 1);
      const parsedBedNum = addFormData.bed_number ? Number(addFormData.bed_number) : null;
      const chosenCondition = addFormData.Condation || 'Normal';

      const payloadData = {
        patient_id: generatedDocPatId,
        name: addFormData.name.trim(),
        contact: addFormData.contact.trim(),
        email: addFormData.email.trim() || `${generatedDocPatId.toLowerCase()}@patient.hospital.com`,
        age: addFormData.age ? Number(addFormData.age) : null,
        gender: addFormData.gender,
        blood_group: addFormData.blood_group,
        Blood_Group: addFormData.blood_group,
        address: addFormData.address,
        hospital: chosenHospId,
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : '',
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        bed_number: parsedBedNum,
        nurse: addFormData.nurse ? Number(addFormData.nurse) : null,
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(addFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(addFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: addFormData.payment_status,
        payment_method: addFormData.payment_method,
        symptoms_diagnosis: addFormData.symptoms_diagnosis || 'General Consultation',
        reason_for_visit: addFormData.symptoms_diagnosis || 'General Consultation',
        Condation: chosenCondition,
        condation: chosenCondition,
        condition: chosenCondition,
        Condition: chosenCondition,
        symptoms_severity: chosenCondition,
        status: addFormData.status || 'Admitted',
        is_active: Boolean(addFormData.is_active)
      };

      let response;
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
        const successMsg = resData.message || `Patient ${addFormData.name} admitted successfully! (UHID: ${createdId})`;
        alert(successMsg);
        setAddSelectedFile(null);
        setIsAddModalOpen(false);
        fetchAllData();
      } else {
        const data = response ? await response.json().catch(() => ({})) : {};
        let errMsg = data.message || data.detail || data.error;
        if (!errMsg && typeof data === 'object') {
          errMsg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to register patient in hospital system.');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.message || 'Error creating patient file.');
    }
  };

  const handleViewPatientDetails = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
      localStorage.setItem('selectedPatient', JSON.stringify(patient));
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  const filteredPatients = patients.filter(p => {
    const pName = (p.name || '').toLowerCase();
    const pId = (p.patient_id || p.uhid || '').toLowerCase();
    const pContact = (p.contact || p.phone || '').toLowerCase();
    const pDoc = (p.doctor_name || '').toLowerCase();

    const matchesSearch = pName.includes(searchTerm.toLowerCase()) ||
                          pId.includes(searchTerm.toLowerCase()) ||
                          pContact.includes(searchTerm.toLowerCase()) ||
                          pDoc.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || (p.status || 'Confirmed') === statusFilter;
    const patCond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
    const matchesSeverity = severityFilter === 'ALL' || patCond === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Front Desk Patient Admissions & UHID Registry
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">
              Patient Admissions & Registrations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Admit new patients, assign doctors & beds, collect consultation fees, and access clinical records.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_anassine')}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-400/40 transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Unassigned Queue
            </button>
            <button
              type="button"
              onClick={fetchAllData}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              + Admit New Patient
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Registered</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{patients.length}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Patient database entries</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Currently Admitted</p>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {patients.filter(p => (p.status || '').toLowerCase().includes('admit')).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">In ward / beds</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase">OPD / Pending</p>
          <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
            {patients.filter(p => !(p.status || '').toLowerCase().includes('admit')).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Consultations in queue</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-600 uppercase">Urgent / Emergency</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">
            {patients.filter(p => ['Urgent', 'Emergency', 'Critical'].includes(p.Condation || p.condition || p.symptoms_severity)).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">High priority cases</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by UHID, patient name, phone, doctor..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition cursor-pointer"
          >
            <option value="ALL">All Admission Statuses</option>
            <option value="Admitted">Admitted</option>
            <option value="Pending">Pending / In Queue</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Discharged">Discharged</option>
          </select>
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition cursor-pointer"
          >
            <option value="ALL">All Clinical Conditions</option>
            <option value="Normal">Normal Condition</option>
            <option value="Urgent">Urgent Attention</option>
            <option value="Emergency">Emergency Case</option>
            <option value="Critical">Critical Severity</option>
          </select>
        </div>
      </div>

      {/* PATIENT LIST TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Registered In-Patients & OPD File Records ({filteredPatients.length})
            </h2>
            <p className="text-xs text-slate-500">Live reception triage registry</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[780px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Patient UHID & Name</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Bed & Floor</th>
                <th className="py-3 px-3">Doctor Assigned</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Loading patients database...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">No patient records found matching your filters.</td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((p, idx) => {
                  const cond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
                  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                                    cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="text-sm font-bold text-slate-900">{p.name}</div>
                        <span className="font-mono text-[11px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          {p.patient_id || p.uhid || `PAT-${p.id}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {p.age ? `${p.age} Yrs` : '-'} • {p.gender || 'Male'}
                        {p.blood_group && <span className="block font-bold text-rose-600">{p.blood_group}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                          p.bed_number ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.bed_number ? `Bed #${p.bed_number} (Floor ${getFloorNumber(p.bed_number)})` : 'OPD / Triage'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {p.doctor_name || 'Dr. Assigned'}
                        {p.doctor_specialization && <span className="block text-[10px] text-teal-600 font-semibold">{p.doctor_specialization}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${condColor}`}>
                          {cond}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.payment_status || 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-teal-50 text-teal-800 border-teal-200">
                          {p.status || 'Confirmed'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(p)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          View Details ➔
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < filteredPatients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More Patients ({filteredPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* MODAL: ADMIT NEW PATIENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Front Desk Patient Admission</h3>
                <p className="text-xs text-slate-300">Generate UHID, book OPD consultation, or allocate inpatient bed</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">UHID / Patient File ID</label>
                  <input
                    type="text"
                    name="patient_id"
                    value={addFormData.patient_id}
                    onChange={handleAddChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={addFormData.name}
                    onChange={handleAddChange}
                    placeholder="e.g. Ramesh Kumar"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={addFormData.age}
                    onChange={handleAddChange}
                    placeholder="Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    name="gender"
                    value={addFormData.gender}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    name="blood_group"
                    value={addFormData.blood_group}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="contact"
                    value={addFormData.contact}
                    onChange={handleAddChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={addFormData.email}
                    onChange={handleAddChange}
                    placeholder="patient@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
              </div>

              {/* HOSPITAL & DOCTOR ALLOCATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Hospital</label>
                  <select
                    name="hospital"
                    value={addFormData.hospital}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.Name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Consulting Doctor</label>
                  <select
                    name="doctor"
                    value={addFormData.doctor}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || d.specialty || 'General'}) - ₹{d.consultation_fee || 500}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BED & NURSE ALLOCATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed Number (Leave blank for OPD)</label>
                  <input
                    type="number"
                    name="bed_number"
                    value={addFormData.bed_number}
                    onChange={handleAddChange}
                    placeholder="e.g. 102 (Floor 2)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Designated Nurse</label>
                  <select
                    name="nurse"
                    value={addFormData.nurse}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="">Auto Assign Station Nurse</option>
                    {nurses.map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.ward || 'General'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CLINICAL CONDITION & SYMPTOMS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Condition Severity</label>
                  <select
                    name="Condation"
                    value={addFormData.Condation}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="Normal">Normal Condition</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Admission Status</label>
                  <select
                    name="status"
                    value={addFormData.status}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="Admitted">Admitted</option>
                    <option value="Pending">Pending / In Queue</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Symptoms / Reason For Visit</label>
                <textarea
                  name="symptoms_diagnosis"
                  rows={2}
                  value={addFormData.symptoms_diagnosis}
                  onChange={handleAddChange}
                  placeholder="Describe patient complaints, fever, chest pain, vitals..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                ></textarea>
              </div>

              {/* BILLING & PAYMENT */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Billing Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">Doctor Fee (₹)</label>
                    <input
                      type="number"
                      name="consultation_fee"
                      value={addFormData.consultation_fee}
                      onChange={handleAddChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Facility Charges (₹)</label>
                    <input
                      type="number"
                      name="Hospitals_Chargies"
                      value={addFormData.Hospitals_Chargies}
                      onChange={handleAddChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      name="amount_paid"
                      value={addFormData.amount_paid}
                      onChange={handleAddChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Payment Status</label>
                    <select
                      name="payment_status"
                      value={addFormData.payment_status}
                      onChange={handleAddChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DOCUMENT ATTACHMENT */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attach ID Proof / Medical Document</label>
                <input
                  type="file"
                  onChange={(e) => setAddSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm & Admit Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPatient;
