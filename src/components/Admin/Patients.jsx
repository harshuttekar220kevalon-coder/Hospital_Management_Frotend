import React, { useState, useEffect } from 'react';

const AdminPatients = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedHospital }) => {
  const [patients, setPatients] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('ALL');
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
    Hospitals_Chargies: 0.00,
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

  const generatePatientId = () => `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

  const fetchAdminPatientsAndDoctors = async () => {
    try {
      setLoading(true);

      let assignedHospitalId = currentUser?.hospital || null;

      try {
        const adminsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
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
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${assignedHospitalId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      }

      if (!hosp) {
        const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
        if (allHospRes && allHospRes.ok) {
          const allHosp = await allHospRes.json();
          hosp = (assignedHospitalId ? allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) : null) || allHosp[0] || null;
          if (hosp) assignedHospitalId = hosp.id;
        }
      }

      if (hosp) {
        setHospitalData(hosp);
        if (setSelectedHospital) setSelectedHospital(hosp);
      }

      const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docRes && docRes.ok) {
        const allDocs = await docRes.json();
        if (assignedHospitalId) {
          const branchDocs = allDocs.filter(d => {
            const hospIds = Array.isArray(d.hospitals)
              ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
              : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
            return hospIds.includes(Number(assignedHospitalId));
          });
          setDoctorsList(branchDocs.length > 0 ? branchDocs : allDocs);
        } else {
          setDoctorsList(allDocs);
        }
      }

      const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
      if (patRes && patRes.ok) {
        const allPatients = await patRes.json();
        if (assignedHospitalId) {
          const branchPatients = allPatients.filter(p => Number(p.hospital) === Number(assignedHospitalId));
          setPatients(branchPatients.length > 0 ? branchPatients : allPatients);
        } else {
          setPatients(allPatients);
        }
      }
    } catch (err) {
      console.error('Error loading patients data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminPatientsAndDoctors();
  }, [currentUser]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, activeTab, doctorFilter, severityFilter]);

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

  const handleConsultationFeeChange = (e) => {
    const fee = parseFloat(e.target.value) || 0.00;
    const hospCharge = Number(addFormData.Hospitals_Chargies) || 0.00;
    const totalAmount = fee + hospCharge;
    setAddFormData(prev => ({
      ...prev,
      consultation_fee: e.target.value,
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
      alert('Patient Name is required.');
      return;
    }

    try {
      const generatedDocPatId = generatePatientId();
      const selectedDocObj = doctorsList.find(d => d.id === Number(addFormData.doctor));
      const hospId = Number(hospitalData?.id || currentUser?.hospital || 1);
      let response;

      const payloadData = {
        patient_id: generatedDocPatId,
        name: addFormData.name.trim(),
        contact: (addFormData.contact || '').replace(/\D/g, '').slice(0, 10),
        email: (addFormData.email || '').trim(),
        age: addFormData.age ? Number(addFormData.age) : null,
        gender: addFormData.gender,
        blood_group: addFormData.blood_group,
        address: (addFormData.address || '').trim(),
        hospital: hospId,
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : '',
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(addFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(addFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: addFormData.payment_status || 'Pending',
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
        fetchAdminPatientsAndDoctors();
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
      setCurrentPage('admin_patient_details');
    }
  };

  const admittedCount = patients.filter(p => (p.status || '').toLowerCase().includes('admit')).length;
  const opdCount = patients.filter(p => (p.status || '').toLowerCase().includes('pending') || (p.status || '').toLowerCase().includes('assigned')).length;
  const dischargedCount = patients.filter(p => (p.status || '').toLowerCase().includes('discharg') || (p.status || '').toLowerCase().includes('complet')).length;

  const filteredPatients = patients.filter(pat => {
    const term = searchTerm.toLowerCase();
    const fullName = (pat.name || '').toLowerCase();
    const patientId = (pat.patient_id || pat.uhid || '').toLowerCase();
    const docName = (pat.doctor_name || '').toLowerCase();
    const contact = (pat.contact || pat.phone || '').toLowerCase();
    const diagnosis = (pat.symptoms_diagnosis || '').toLowerCase();

    const matchesSearch =
      fullName.includes(term) ||
      patientId.includes(term) ||
      docName.includes(term) ||
      contact.includes(term) ||
      diagnosis.includes(term);

    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'Admitted' && (pat.status || '').toLowerCase().includes('admit')) ||
      (activeTab === 'OPD' && ((pat.status || '').toLowerCase().includes('pending') || (pat.status || '').toLowerCase().includes('assigned'))) ||
      (activeTab === 'Discharged' && (pat.status || '').toLowerCase().includes('discharg'));

    const matchesDoctor = doctorFilter === 'ALL' || String(pat.doctor) === String(doctorFilter);
    const matchesSeverity = severityFilter === 'ALL' || (pat.symptoms_severity || '').toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesTab && matchesDoctor && matchesSeverity;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
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
              Live admissions, OPD queues, clinical diagnoses, and billing status for this branch.
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
            <button
              type="button"
              onClick={fetchAdminPatientsAndDoctors}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patients</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-teal-50 text-teal-700 border-teal-200">
              Total Roster
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Branch Patients</p>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{patients.length} Registered</h3>
          <p className="text-xs text-slate-500 mt-1">Under care at this facility</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admissions</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
              In-Patients
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Admitted in Wards</p>
          <h3 className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">{admittedCount} Admitted</h3>
          <p className="text-xs text-emerald-600 mt-1">Occupying Hospital Beds</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out-Patients</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
              OPD Queue
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">OPD / Consultation</p>
          <h3 className="text-lg sm:text-xl font-bold text-amber-700 mt-0.5">{opdCount} Active OPD</h3>
          <p className="text-xs text-amber-600 mt-1">Consultation & Triage</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Discharged</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
              Completed
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Discharged Patients</p>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{dischargedCount} Recovered</h3>
          <p className="text-xs text-slate-500 mt-1">Successful Treatments</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            { id: 'ALL', label: 'All Patients', count: patients.length },
            { id: 'Admitted', label: 'Admitted In-Patients', count: admittedCount },
            { id: 'OPD', label: 'OPD / Consultation', count: opdCount },
            { id: 'Discharged', label: 'Discharged / History', count: dischargedCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient, ID, doctor, diagnosis..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Doctors</option>
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              {severityLevels.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold text-slate-500">Loading branch patients from backend...</p>
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
            <table className="w-full text-center text-xs text-slate-600 min-w-[850px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Patient Name & ID</th>
                  <th className="py-3.5 px-4 text-center">Assigned Doctor</th>
                  <th className="py-3.5 px-4 text-center">Symptoms & Diagnosis</th>
                  <th className="py-3.5 px-4 text-center">CONTACT & EMAIL</th>
                  <th className="py-3.5 px-4 text-center">Payment</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.slice(0, visibleCount).map((pat) => {
                  const emailLower = (pat.email || '').toLowerCase();
                  const assignedDoc = doctorsList.find(d => Number(d.id) === Number(pat.doctor));
                  const severity = pat.symptoms_severity || 'Normal';

                  const severityBadgeClass =
                    severity === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' :
                    severity === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    severity === 'Moderate' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800 break-words">{pat.name || 'Patient'}</div>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {pat.patient_id || pat.uhid || `PAT-${pat.id}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">{pat.age}Y • {pat.gender || 'M'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-slate-800">{assignedDoc?.name || pat.doctor_name || 'Dr. Consultant'}</div>
                        <span className="text-[10px] text-teal-700 block mt-0.5">{assignedDoc?.specialization || 'General'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="text-slate-700 max-w-[180px] mx-auto truncate font-medium">{pat.symptoms_diagnosis || 'General Consultation'}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] border inline-block mt-0.5 ${severityBadgeClass}`}>
                          {severity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {pat.contact || pat.phone || '-'}
                          </span>
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              title={`Send email to ${emailLower}`}
                              className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline block lowercase transition truncate max-w-[180px]"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            pat.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            pat.payment_status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {pat.payment_status || 'Paid'} • ₹{pat.amount_paid || (Number(pat.consultation_fee || 0) + Number(pat.Hospitals_Chargies || pat.hospital_charges || 0)) || 500}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Doc: ₹{pat.consultation_fee ?? 0} | Hosp: ₹{pat.Hospitals_Chargies ?? pat.hospital_charges ?? 0}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          (pat.status || '').toLowerCase().includes('admit') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          (pat.status || '').toLowerCase().includes('discharg') ? 'bg-slate-100 text-slate-700 border-slate-300' :
                          'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {pat.status || 'Admitted'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(pat)}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200 inline-flex items-center justify-center gap-1"
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
                    <option value="">Select Blood Group</option>
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
                    onChange={(e) => setAddFormData({ ...addFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={hospitalData?.Name ? `${hospitalData.Name} (${hospitalData.city || ''})` : 'Assigned Hospital Branch'}
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
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Consultation Fee (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addFormData.consultation_fee}
                      onChange={handleConsultationFeeChange}
                      placeholder="e.g. 500.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Credited to Doctor earnings</p>
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
                      <option value="">Select Method</option>
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
                    <option value="">Select Status</option>
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
