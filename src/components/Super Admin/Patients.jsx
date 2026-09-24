import React, { useState, useEffect } from 'react';

const Patients = ({ currentUser, setCurrentPage, setSelectedPatient }) => {
  const [patients, setPatients] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'];
  const severityLevels = ['Normal', 'Moderate', 'Urgent', 'Emergency'];
  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Failed'];
  const paymentMethods = ['Cash', 'UPI', 'Credit Card', 'Net Banking'];

  const initialAddFormState = {
    patient_id: '',
    name: '',
    age: '',
    gender: 'Male',
    blood_group: '',
    contact: '',
    email: '',
    address: '',
    hospital: '',
    doctor: '',
    consultation_fee: 0.00,
    amount_paid: 0.00,
    payment_status: 'Pending',
    payment_method: '',
    symptoms_diagnosis: '',
    symptoms_severity: '',
    visit_date_time: '',
    status: '',
    is_active: true,
    attached_document: '',
    attached_document_name: ''
  };

  const [addFormData, setAddFormData] = useState(initialAddFormState);
  const [addSelectedFile, setAddSelectedFile] = useState(null);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, activeTab, hospitalFilter, specializationFilter, severityFilter]);

  const generatePatientId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `PAT-${randomNum}`;
  };

  const getHospitalDoctorList = (hospitalId, docs) => {
    if (!hospitalId) return [];
    const targetHospId = Number(hospitalId);
    return (docs || []).filter(d => {
      const hospIds = Array.isArray(d.hospitals)
        ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
        : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
      return hospIds.includes(targetHospId);
    });
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const hospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospRes && hospRes.ok) {
        const hospData = await hospRes.json();
        setHospitalsList(hospData);
      }

      const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docRes && docRes.ok) {
        const docData = await docRes.json();
        setDoctorsList(docData);
      }

      const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminsList(adminData);
      }

      const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
      if (patRes && patRes.ok) {
        const patData = await patRes.json();
        setPatients(patData);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error('Error fetching backend data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // When doctor is selected, auto-fill consultation fee from that doctor's profile
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    const selectedDoc = doctorsList.find(d => d.id === Number(docId));
    const fee = selectedDoc ? (selectedDoc.consultation_fee ?? 0.00) : 0.00;

    setAddFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: fee // Default amount paid to full fee
    }));
  };

  const todayDateStr = new Date().toISOString().split('T')[0];

  const isAppliedToday = (item) => {
    if (!item.applied_at && !item.created_at) return false;
    const dateVal = item.applied_at || item.created_at;
    return dateVal.includes(todayDateStr);
  };

  const todayApplicationsCount = patients.filter(p => isAppliedToday(p)).length;
  const totalPatientsCount = patients.length;
  const pendingCount = patients.filter(p => p.status === 'Pending' || p.status === 'Pending Review').length;
  const assignedCount = patients.filter(p => p.status === 'Assigned').length;
  const admittedCount = patients.filter(p => p.status === 'Admitted' || p.status === 'Confirmed' || p.status === 'In Consultation').length;
  const dischargedCount = patients.filter(p => p.status === 'Discharged' || p.status === 'Completed').length;
  const cancelledCount = patients.filter(p => p.status === 'Cancelled').length;

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase();

    if (activeTab === 'TODAY' && !isAppliedToday(patient)) return false;
    if (activeTab === 'PENDING' && patient.status !== 'Pending' && patient.status !== 'Pending Review') return false;
    if (activeTab === 'ASSIGNED' && patient.status !== 'Assigned') return false;
    if (activeTab === 'ADMITTED' && patient.status !== 'Admitted' && patient.status !== 'Confirmed' && patient.status !== 'In Consultation') return false;
    if (activeTab === 'DISCHARGED' && patient.status !== 'Discharged' && patient.status !== 'Completed') return false;
    if (activeTab === 'CANCELLED' && patient.status !== 'Cancelled') return false;

    const assignedHosp = hospitalsList.find(h => h.id === patient.hospital);
    const hospName = assignedHosp ? assignedHosp.Name : (patient.hospital_name || '');

    const matchesSearch =
      (patient.name || '').toLowerCase().includes(term) ||
      (patient.patient_id || patient.uhid || '').toLowerCase().includes(term) ||
      (patient.contact || patient.phone || '').toLowerCase().includes(term) ||
      (patient.email || '').toLowerCase().includes(term) ||
      (patient.address || '').toLowerCase().includes(term) ||
      (patient.doctor_name || '').toLowerCase().includes(term) ||
      hospName.toLowerCase().includes(term) ||
      (patient.symptoms_diagnosis || patient.reason_for_visit || '').toLowerCase().includes(term);

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : (patient.hospital || '').toString() === hospitalFilter || hospName.toLowerCase().includes(hospitalFilter.toLowerCase());

    const matchesSpec =
      specializationFilter === 'ALL'
        ? true
        : (patient.doctor_specialization || '').toLowerCase().includes(specializationFilter.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL'
        ? true
        : (patient.symptoms_severity || '').toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesHospital && matchesSpec && matchesSeverity;
  });

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
    try {
      const generatedDocPatId = generatePatientId();
      const selectedDocObj = doctorsList.find(d => d.id === Number(addFormData.doctor));
      let response;

      const payloadData = {
        patient_id: generatedDocPatId,
        name: addFormData.name.trim(),
        contact: addFormData.contact.trim(),
        email: addFormData.email.trim(),
        age: addFormData.age ? Number(addFormData.age) : null,
        gender: addFormData.gender,
        blood_group: addFormData.blood_group,
        address: (addFormData.address || '').trim(),
        hospital: addFormData.hospital ? Number(addFormData.hospital) : null,
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : '',
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: addFormData.payment_status,
        payment_method: addFormData.payment_method,
        symptoms_diagnosis: addFormData.symptoms_diagnosis,
        symptoms_severity: addFormData.symptoms_severity,
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

        response = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/', {
          method: 'POST',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const resData = await response.json().catch(() => ({}));
        const createdId = resData.patient_id || generatedDocPatId;
        alert(`Patient registered successfully with payment details!\nPatient ID: ${createdId}`);
        setAddSelectedFile(null);
        setIsAddModalOpen(false);
        fetchAllData();
      } else {
        const data = response ? await response.json().catch(() => ({})) : {};
        alert('Failed to register patient: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Network error while registering patient.');
    }
  };

  const handleViewPatientDetails = (pat) => {
    if (setSelectedPatient) {
      setSelectedPatient(pat);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(pat));
    if (setCurrentPage) {
      setCurrentPage('patient_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Patient Registrations & Billing
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {todayApplicationsCount} Applied Today
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                {pendingCount} Pending
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Patients & Incoming Applications Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live surveillance of patient registrations, doctor consultation fees, payment tracking, and documents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Register Patient
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('TODAY')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${activeTab === 'TODAY' ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-300' : 'bg-white border-slate-200 hover:border-sky-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Inflow</p>
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
          </div>
          <h3 className="text-2xl font-bold text-sky-900 mt-1">{todayApplicationsCount}</h3>
          <p className="text-[11px] text-sky-700 mt-0.5 font-medium">Applied Today</p>
        </div>

        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${activeTab === 'ALL' ? 'bg-slate-100/90 border-slate-400 ring-2 ring-slate-300' : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalPatientsCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Database Registry</p>
        </div>

        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${activeTab === 'PENDING' ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</h3>
          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting Action</p>
        </div>

        <div
          onClick={() => setActiveTab('ADMITTED')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${activeTab === 'ADMITTED' ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300' : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Admitted / In Care</p>
          <h3 className="text-2xl font-bold text-purple-700 mt-1">{admittedCount}</h3>
          <p className="text-[11px] text-purple-600 mt-0.5">Active Inpatient</p>
        </div>

        <div
          onClick={() => setActiveTab('DISCHARGED')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${activeTab === 'DISCHARGED' ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Discharged</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{dischargedCount}</h3>
          <p className="text-[11px] text-emerald-600 mt-0.5">Completed Consultations</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-xl border border-slate-300 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('TODAY')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'TODAY' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Today ({todayApplicationsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'ALL' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          All ({totalPatientsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'PENDING' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ASSIGNED')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'ASSIGNED' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Assigned ({assignedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ADMITTED')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'ADMITTED' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Admitted ({admittedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DISCHARGED')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'DISCHARGED' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Discharged ({dischargedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CANCELLED')}
          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${activeTab === 'CANCELLED' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
        >
          Cancelled ({cancelledCount})
        </button>
      </div>

      {/* SEARCH AND DROPDOWN FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient ID, name, phone, doctor, hospital, or symptoms..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Hospital Branches</option>
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.Name} ({h.city})
              </option>
            ))}
          </select>

          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Specializations</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Obstetrics">Obstetrics & Gynecology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General">General Medicine</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Triage Severities</option>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* PATIENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading patient records from database...</p>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-semibold text-slate-500">No patient applications found in database.</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "+ Register Patient" to add a new record.</p>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Patient ID</th>
                  <th className="py-3.5 px-4 text-center">Visit Time</th>
                  <th className="py-3.5 px-4 text-center">Doctor</th>
                  <th className="py-3.5 px-4 text-center">Target Hospital</th>
                  <th className="py-3.5 px-4 text-center">Payment</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.slice(0, visibleCount).map((pat) => {
                  const hospId = Number(typeof pat.hospital === 'object' ? pat.hospital?.id : pat.hospital);
                  const assignedHosp = hospitalsList.find(h => h.id === hospId) || hospitalsList.find(h => h.id === Number(pat.hospital));
                  const displayId = pat.patient_id || pat.uhid || `PAT-${pat.id}`;
                  const displayDoctor = pat.doctor_name || (pat.doctor ? (typeof pat.doctor === 'object' ? pat.doctor.name : doctorsList.find(d => d.id === pat.doctor)?.name) : 'Assigned Doctor');
                  const displayHospital = assignedHosp ? assignedHosp.Name : (pat.hospital_name && !/^\d+$/.test(pat.hospital_name) ? pat.hospital_name : 'Unassigned');
                  const displayVisitTime = pat.visit_date_time ? new Date(pat.visit_date_time).toLocaleString() : (pat.appointment_time || 'Not Scheduled');
                  const appliedToday = isAppliedToday(pat);

                  return (
                    <tr key={pat.id} className={`transition ${appliedToday ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                            {displayId}
                          </span>
                          {appliedToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-600 text-white uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <p className="font-semibold text-slate-800">
                          {displayVisitTime}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <p className="font-semibold text-slate-800">
                          {displayDoctor}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {assignedHosp || (pat.hospital_name && !/^\d+$/.test(pat.hospital_name)) ? (
                          <span className="font-semibold text-slate-800">
                            {assignedHosp ? assignedHosp.Name : pat.hospital_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${pat.payment_status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pat.payment_status === 'Failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : pat.payment_status === 'Partial'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {pat.payment_status || 'Pending'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${pat.status === 'Confirmed' || pat.status === 'Admitted' || pat.status === 'Discharged' || pat.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pat.status === 'Cancelled' || pat.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {pat.status || 'Confirmed'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(pat)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
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
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* REGISTER / ADD PATIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Patient</h2>
                <p className="text-xs text-slate-500">Add patient profile, doctor consultation fee, payment details, and branch.</p>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase">Patient ID / UHID</label>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Auto-Generated
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value="Auto-Generated upon creation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 italic font-medium cursor-not-allowed select-none focus:outline-none"
                />
              </div>

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
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="10-digit number"
                    value={addFormData.contact}
                    onChange={(e) => setAddFormData({ ...addFormData, contact: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
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

              {/* TARGET HOSPITAL BRANCH & AFFILIATED DOCTOR SELECTION */}
              {(() => {
                const availableDoctorsForAdd = getHospitalDoctorList(addFormData.hospital, doctorsList);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch *</label>
                      <select
                        required
                        value={addFormData.hospital}
                        onChange={(e) => {
                          const newHospId = e.target.value;
                          const docsInNewHosp = getHospitalDoctorList(newHospId, doctorsList);
                          const currentDocStillValid = docsInNewHosp.some(d => d.id === Number(addFormData.doctor));
                          setAddFormData(prev => ({
                            ...prev,
                            hospital: newHospId,
                            doctor: currentDocStillValid ? prev.doctor : '',
                            consultation_fee: currentDocStillValid ? prev.consultation_fee : 0.00,
                            amount_paid: currentDocStillValid ? prev.amount_paid : 0.00
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                      >
                        <option value="">-- Select Target Hospital Branch --</option>
                        {hospitalsList.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.Name} ({h.city}) - {h.Branch_Code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Assigned Doctor {addFormData.hospital ? `(${availableDoctorsForAdd.length} available in this branch)` : ''} *
                      </label>
                      <select
                        required
                        disabled={!addFormData.hospital}
                        value={addFormData.doctor}
                        onChange={handleDoctorChange}
                        className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-medium ${!addFormData.hospital
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 cursor-pointer'
                          }`}
                      >
                        {!addFormData.hospital ? (
                          <option value="">-- Select Target Hospital Branch First --</option>
                        ) : availableDoctorsForAdd.length === 0 ? (
                          <option value="">-- No Doctors in this Hospital Branch --</option>
                        ) : (
                          <>
                            <option value="">-- Select Doctor ({availableDoctorsForAdd.length} Available) --</option>
                            {availableDoctorsForAdd.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.specialization || d.specialty || 'Doctor'}) [₹{d.consultation_fee ?? 0}]
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {!addFormData.hospital ? (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">
                          Please select a hospital branch above to view its affiliated doctors.
                        </p>
                      ) : availableDoctorsForAdd.length === 0 ? (
                        <p className="text-[10px] text-rose-600 mt-1 font-medium">
                          No doctors are currently affiliated with this hospital branch.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {/* PAYMENT SECTION */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <p className="font-bold text-emerald-900 uppercase text-[11px]">Payment & Consultation Fee Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addFormData.consultation_fee}
                      onChange={(e) => setAddFormData({ ...addFormData, consultation_fee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addFormData.amount_paid}
                      onChange={(e) => setAddFormData({ ...addFormData, amount_paid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                    <select
                      value={addFormData.payment_status}
                      onChange={(e) => setAddFormData({ ...addFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold cursor-pointer"
                    >
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

export default Patients;