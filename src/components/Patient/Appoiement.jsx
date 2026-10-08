import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientAppointment = ({ setCurrentPage, isLoggedIn, currentUser, onLogout }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const bloodGroupChoices = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const conditionChoices = [
    { value: 'Normal', label: 'Normal' },
    { value: 'Urgent', label: 'Urgent' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'Critical', label: 'Critical' }
  ];

  const getBackgroundVisitDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  };

  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    gender: currentUser?.Gender || currentUser?.gender || '',
    contact: '',
    email: currentUser?.email || '',
    address: '',
    hospital: '',
    blood_group: '',
    condition: '',
    symptoms_diagnosis: ''
  });

  const [attachedFile, setAttachedFile] = useState(null);

  // Sync email & gender with currentUser or backend patient record when logged in
  useEffect(() => {
    let isMounted = true;
    const fetchPatientProfile = async () => {
      const email = (currentUser?.email || '').toLowerCase().trim();
      if (!email) return;

      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          const pats = await patRes.json().catch(() => []);
          if (Array.isArray(pats) && pats.length > 0) {
            const matched = pats.find(p => (p.email || '').toLowerCase().trim() === email);
            if (matched && isMounted) {
              const backendGender = matched.Gender || matched.gender || currentUser?.Gender || currentUser?.gender || '';
              const backendBlood = matched.Blood_Group || matched.blood_group || '';
              const backendName = matched.name || matched.patient_Name || matched.patient_name || '';
              const backendPhone = matched.contact || matched.phone || '';
              const backendAge = matched.age || matched.Age || '';
              const backendAddress = matched.address || '';

              setFormData(prev => ({
                ...prev,
                email: currentUser.email,
                gender: prev.gender || backendGender,
                patient_name: prev.patient_name || backendName,
                contact: prev.contact || backendPhone,
                age: prev.age || (backendAge ? String(backendAge) : ''),
                address: prev.address || backendAddress,
                blood_group: prev.blood_group || backendBlood
              }));
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching patient profile for gender sync:', err);
      }

      if (isMounted) {
        setFormData(prev => ({
          ...prev,
          email: currentUser.email,
          gender: prev.gender || currentUser.Gender || currentUser.gender || ''
        }));
      }
    };

    fetchPatientProfile();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Fetch Hospitals list from backend
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);

        let hospList = [];
        if (hospRes && hospRes.ok) {
          hospList = await hospRes.json().catch(() => []);
        }

        if (isMounted) {
          setHospitals(Array.isArray(hospList) ? hospList : []);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick Action: Autofill logged-in user's own details if clicked
  const handleAutofillMyself = () => {
    if (!currentUser) return;
    const currentPatName = currentUser.patient_name || currentUser.patient_Name || currentUser.name || '';
    const currentBlood = currentUser.blood_group || currentUser.Blood_Group || '';
    const currentGender = currentUser.Gender || currentUser.gender || '';
    const currentContact = currentUser.contact || currentUser.phone || '';
    const currentEmail = currentUser.email || '';
    const currentAge = currentUser.age || currentUser.Age || '';
    const currentAddress = currentUser.address || currentUser.Address || '';
    setFormData(prev => ({
      ...prev,
      patient_name: currentPatName,
      age: currentAge ? String(currentAge) : prev.age,
      gender: currentGender || prev.gender,
      contact: currentContact || prev.contact,
      email: currentEmail || prev.email,
      address: currentAddress || prev.address,
      blood_group: currentBlood || prev.blood_group
    }));
  };

  // Quick Action: Clear optional fields (Preserves logged-in email)
  const handleClearPatientInfo = () => {
    setFormData({
      patient_name: '',
      age: '',
      gender: currentUser?.Gender || currentUser?.gender || '',
      contact: '',
      email: currentUser?.email || '',
      address: '',
      hospital: '',
      blood_group: '',
      condition: '',
      symptoms_diagnosis: ''
    });
    setAttachedFile(null);
  };

  const activeHospital = hospitals.find((h) => String(h.id) === String(formData.hospital)) || {};

  const handleGoToLogin = () => {
    try {
      localStorage.setItem('login_return_page', 'appoint');
    } catch { }
    if (setCurrentPage) {
      setCurrentPage('login');
    }
  };

  const handleGoToSignUp = () => {
    try {
      localStorage.setItem('login_return_page', 'appoint');
    } catch { }
    if (setCurrentPage) {
      setCurrentPage('signin');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  // ============================================================
  // SUBMIT HANDLER: SENDS APPOINTMENT DATA TO DJANGO BACKEND API
  // ============================================================
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      alert('Please log in to your account first to book an appointment.');
      handleGoToLogin();
      return;
    }

    const enteredName = (formData.patient_name || '').trim();
    if (!enteredName) {
      alert('Please enter patient full name.');
      return;
    }

    const loggedInEmail = (currentUser?.email || '').trim().toLowerCase();
    const enteredEmail = (formData.email || loggedInEmail).trim();
    if (!enteredEmail) {
      alert('Appointment book karne ke liye patient ka email dena anivarya hai!');
      return;
    }

    if (loggedInEmail && enteredEmail.toLowerCase() !== loggedInEmail) {
      alert(`⚠️ Validation Error: Aap sirf apni logged-in email (${currentUser.email}) se hi appointment book kar sakte hain! Kisi aur patient ki email nahi daal sakte.`);
      return;
    }

    const finalEmail = currentUser?.email ? currentUser.email.trim() : enteredEmail;

    if (!formData.gender) {
      alert('Please select patient gender (Male, Female, or Other).');
      return;
    }

    if (!formData.hospital) {
      alert('Please select a hospital branch.');
      return;
    }

    if (!formData.blood_group) {
      alert('Please select patient blood group.');
      return;
    }

    if (!formData.condition) {
      alert('Please select condition severity.');
      return;
    }

    if (!formData.symptoms_diagnosis.trim()) {
      alert('Please enter symptoms or reason for appointment.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const selectedHospId = formData.hospital ? Number(formData.hospital) : null;
      const chosenHosp = hospitals.find(h => Number(h.id) === selectedHospId);
      const hospName = chosenHosp?.Name || chosenHosp?.name || activeHospital?.Name || activeHospital?.name || 'Apex Care Hospital';
      const hospAddr = chosenHosp?.Address || chosenHosp?.address || activeHospital?.Address || activeHospital?.address || 'Hospital Branch Campus';
      const hospCity = chosenHosp?.City || chosenHosp?.city || activeHospital?.City || activeHospital?.city || '';

      const selectedDocId = null;
      const docName = 'Awaiting Receptionist Assignment';
      const docSpecialty = 'Triage / General OPD';

      const visitIsoString = getBackgroundVisitDateTime();

      const ageVal = formData.age ? String(formData.age).trim() : '25';
      const phoneVal = (formData.contact || '').trim() || '9876543210';
      const addrVal = (formData.address || '').trim() || 'Hospital Inpatient';
      const genderVal = formData.gender || 'Male';

      // ============================================================
      // COMPLETE BACKEND APPOINTMENT PAYLOAD ALIGNED WITH DJANGO MODEL
      // ============================================================
      const appointmentPayload = {
        patient_name: enteredName,
        patient_Name: enteredName,
        name: enteredName,
        age: ageVal,
        gender: genderVal,
        Gender: genderVal,
        patient_gender: genderVal,
        contact: phoneVal,
        phone: phoneVal,
        email: finalEmail,
        address: addrVal,
        hospital: selectedHospId,
        visit_date_time: visitIsoString,
        symptoms_diagnosis: formData.symptoms_diagnosis.trim(),
        reason_for_visit: formData.symptoms_diagnosis.trim(),
        blood_group: formData.blood_group,
        Blood_Group: formData.blood_group,
        hospitals_charges: '0.00',
        Hospitals_Chargies: '0.00',
        hospital_charges: '0.00',
        amount_paid: '0.00',
        payment_status: 'Pending',
        payment_method: 'Cash',
        status: 'Pending',
        checkup_status: 'Pending',
        condition: formData.condition,
        Condation: formData.condition,
        is_active: true
      };

      let apptResponse = null;

      // 1. If an attached document is uploaded, send as multipart/form-data
      if (attachedFile instanceof File) {
        const formDataObj = new FormData();
        Object.entries(appointmentPayload).forEach(([key, val]) => {
          if (val !== null && val !== undefined && val !== '') {
            formDataObj.append(key, val);
          }
        });
        formDataObj.append('attached_document', attachedFile);

        apptResponse = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          body: formDataObj
        });
      } else {
        // 2. Standard JSON POST
        apptResponse = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentPayload)
        });
      }

      // 3. Detailed Response Error Handling
      if (!apptResponse || !apptResponse.ok) {
        let serverErrDetail = '';
        const errorRes = apptResponse;
        if (errorRes) {
          try {
            const rawText = await errorRes.text();
            try {
              const errJson = JSON.parse(rawText);
              serverErrDetail = errJson.message || errJson.detail || errJson.error || errJson.non_field_errors;
              if (Array.isArray(serverErrDetail)) {
                serverErrDetail = serverErrDetail.join(', ');
              }
              if (!serverErrDetail && typeof errJson === 'object') {
                serverErrDetail = Object.entries(errJson)
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
                  .join('; ');
              }
            } catch {
              if (rawText.includes('exception_value')) {
                const match = rawText.match(/<pre class="exception_value">([^<]+)<\/pre>/i) || rawText.match(/<title>([^<]+)<\/title>/i);
                if (match) serverErrDetail = `Django Error: ${match[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim()}`;
              } else if (rawText && rawText.length < 300 && !rawText.includes('<!DOCTYPE')) {
                serverErrDetail = rawText;
              } else if (errorRes.status) {
                serverErrDetail = `Backend HTTP ${errorRes.status}: ${errorRes.statusText || 'Request failed'}`;
              }
            }
          } catch { }
        }
        throw new Error(serverErrDetail || 'Unable to connect to Django backend server. Please verify backend is running on http://127.0.0.1:8000.');
      }

      let resJson = {};
      try {
        resJson = await apptResponse.json().catch(() => ({}));
      } catch { }

      const createdAppointment = resJson.data || resJson;
      const apptBackendId = createdAppointment.Appoment_id || createdAppointment.appoment_id || resJson.Appoment_id || resJson.appoment_id || resJson.appointment_id || createdAppointment.id || Date.now();
      const createdId = createdAppointment.id || resJson.id || apptBackendId;

      const bookingRecord = {
        ...appointmentPayload,
        ...createdAppointment,
        id: createdId,
        Appoment_id: apptBackendId,
        appoment_id: apptBackendId,
        appointment_id: apptBackendId,
        patient_Name: enteredName,
        patient_name: enteredName,
        patientName: enteredName,
        age: formData.age ? String(formData.age).trim() : null,
        contact: (formData.contact || '').trim(),
        phone: (formData.contact || '').trim(),
        email: finalEmail,
        address: (formData.address || '').trim(),
        hospitalName: hospName,
        hospitalAddress: hospAddr,
        hospitalCity: hospCity,
        doctorName: docName,
        doctorSpecialty: docSpecialty,
        visit_date_time: visitIsoString,
        visitDateTime: visitIsoString,
        blood_group: formData.blood_group,
        bloodGroup: formData.blood_group,
        condition: formData.condition,
        conditionStatus: formData.condition,
        symptoms_diagnosis: formData.symptoms_diagnosis.trim(),
        fileName: attachedFile ? attachedFile.name : null,
        status: createdAppointment.status || 'Pending',
        floor: 'Not Assigned'
      };

      try {
        const storedKey = `patient_appointments_${finalEmail.toLowerCase()}`;
        const prevList = JSON.parse(localStorage.getItem(storedKey) || '[]');
        const updatedList = [bookingRecord, ...prevList.filter(p => String(p.id || p.Appoment_id) !== String(bookingRecord.id || bookingRecord.Appoment_id))];
        localStorage.setItem(storedKey, JSON.stringify(updatedList));
      } catch (e) { }

      alert('✓ Appointment booked successfully!');
      setConfirmedBooking(bookingRecord);

    } catch (err) {
      console.error('Error submitting appointment:', err);
      const errMsg = err.message || 'Failed to save appointment in backend database. Please try again.';
      setSubmitError(errMsg);
      alert(`⚠️ ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfirmedBooking(null);
    setAttachedFile(null);
    setFormData({
      patient_name: '',
      age: '',
      contact: '',
      email: currentUser?.email || '',
      address: '',
      hospital: '',
      blood_group: '',
      condition: '',
      symptoms_diagnosis: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="appointment"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-6 sm:space-y-8 pb-16">
        {/* HEADER HERO */}
        <section className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              OPD Appointment Scheduling System
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Hospital Appointment Booking
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Book a doctor consultation for yourself or a family member. All appointment data is securely saved in the hospital backend system.
            </p>
          </div>
        </section>

        {/* AUTHENTICATION LOCK SCREEN (WHEN NOT LOGGED IN) */}
        {!isLoggedIn ? (
          <section className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-lg text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Login or Sign Up to Book Appointment
                </h2>
                <p className="text-xs text-slate-500">
                  Please log in to your patient account or sign up to schedule an appointment.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Log In to Account</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToSignUp}
                  className="w-full py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Create Account (Sign Up)</span>
                </button>
              </div>
            </div>
          </section>
        ) : confirmedBooking ? (
          /* ================= CONFIRMATION RECEIPT & SLIP ================= */
          <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border-2 border-teal-600 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                    Appointment Booking Slip
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {confirmedBooking.hospitalName}
                  </h3>
                  <p className="text-xs text-slate-500">{confirmedBooking.hospitalAddress} {confirmedBooking.hospitalCity ? `• ${confirmedBooking.hospitalCity}` : ''}</p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold uppercase">
                    ✓ Saved in Database
                  </span>
                  <p className="font-mono text-[11px] text-slate-400 mt-1">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* APPOINTMENT ID BANNER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider block">
                    Appointment ID
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-300">
                    #{confirmedBooking.Appoment_id || confirmedBooking.appoment_id || confirmedBooking.appointment_id || confirmedBooking.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Condition Severity
                  </span>
                  <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    {confirmedBooking.condition}
                  </span>
                </div>
              </div>

              {/* DETAILS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient Full Name</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.patient_name || confirmedBooking.patient_Name}</p>
                  <p className="text-slate-500 text-[11px]">
                    {confirmedBooking.age ? `Age: ${confirmedBooking.age} Yrs • ` : ''}
                    Gender: {confirmedBooking.Gender || confirmedBooking.gender || 'Not Specified'} •
                    Blood Group: {confirmedBooking.blood_group || confirmedBooking.Blood_Group}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Contact & Email</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.contact || confirmedBooking.phone || 'Not Provided'}</p>
                  <p className="text-slate-500 text-[11px] truncate">{confirmedBooking.email || 'No email provided'}</p>
                  {confirmedBooking.address && <p className="text-slate-500 text-[11px] truncate">🏠 {confirmedBooking.address}</p>}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Consulting Doctor</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.doctorName}</p>
                  <p className="text-slate-500 text-[11px]">{confirmedBooking.doctorSpecialty}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                  <p className="font-bold text-teal-900 text-sm">{confirmedBooking.status || 'Pending'}</p>
                  <p className="text-slate-500 text-[11px]">OPD Consultation</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Hospital Branch</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.hospitalName}</p>
                  <p className="text-slate-500 text-[11px]">{confirmedBooking.hospitalCity || 'Hospital Campus'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Chief Symptoms / Reason</span>
                  <p className="text-slate-800 text-xs font-medium">{confirmedBooking.symptoms_diagnosis}</p>
                </div>

                {confirmedBooking.fileName && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-0.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Attached Document</span>
                      <p className="text-teal-800 font-semibold text-xs truncate max-w-xs">📎 {confirmedBooking.fileName}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">Uploaded</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage && setCurrentPage('patient_dashboard')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Go to Patient Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* ================= CLEAN APPOINTMENT BOOKING FORM ================= */
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Appointment Registration Form</h2>
                  <p className="text-xs text-slate-300">Fill in patient details and select preferred hospital branch.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-400/30">
                    OPD Consultation
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs font-bold text-slate-600">Loading hospitals and doctors...</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="p-6 sm:p-8 space-y-6">
                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                      {submitError}
                    </div>
                  )}

                  {/* SECTION 1: PATIENT INFORMATION */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                          <span>Patient Information</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Enter patient full name, contact details, and blood group.
                        </p>
                      </div>

                      {/* QUICK ACTION BUTTONS */}
                      <div className="flex items-center gap-2 shrink-0">
                        {currentUser?.name && (
                          <button
                            type="button"
                            onClick={handleAutofillMyself}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                            title="Fill with logged in user details"
                          >
                            <span>👤</span>
                            <span>Fill My Info</span>
                          </button>
                        )}
                        {(formData.patient_name || formData.contact || formData.email || formData.hospital || formData.blood_group || formData.condition || formData.symptoms_diagnosis) && (
                          <button
                            type="button"
                            onClick={handleClearPatientInfo}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold cursor-pointer transition"
                            title="Clear all fields"
                          >
                            Clear Form
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* PATIENT NAME */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Patient Full Name *
                        </label>
                        <input
                          type="text"
                          name="patient_name"
                          required
                          placeholder="Enter patient full name"
                          value={formData.patient_name}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* PATIENT AGE */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Patient Age (Years)
                        </label>
                        <input
                          type="number"
                          name="age"
                          min="0"
                          max="150"
                          maxLength={3}
                          placeholder="e.g. 28"
                          value={formData.age}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* GENDER */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          required
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                        >
                          <option value="">-- Select Gender --</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* BLOOD GROUP */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Blood Group *
                        </label>
                        <select
                          name="blood_group"
                          value={formData.blood_group}
                          onChange={handleChange}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                        >
                          <option value="">-- Select Your Blood Group --</option>
                          {bloodGroupChoices.map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>

                      {/* CONTACT PHONE */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Contact Phone *
                        </label>
                        <input
                          type="tel"
                          name="contact"
                          maxLength={14}
                          required
                          placeholder="e.g. +91 9876543210"
                          value={formData.contact}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* EMAIL ADDRESS */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 uppercase">
                            Email Address *
                          </label>
                          {currentUser?.email && (
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                              <span>🔒</span>
                              <span>Account Email (Locked)</span>
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          name="email"
                          required
                          readOnly={Boolean(currentUser?.email)}
                          placeholder="e.g. patient@example.com"
                          value={currentUser?.email || formData.email}
                          onChange={handleChange}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium shadow-2xs ${currentUser?.email
                            ? 'bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed font-semibold'
                            : 'border-slate-300 text-slate-800 bg-white focus:outline-none focus:border-teal-600'
                            }`}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          {currentUser?.email
                            ? `Appointment will be strictly linked to your portal account (${currentUser.email}).`
                            : 'Enter your registered patient email address.'}
                        </p>
                      </div>

                      {/* RESIDENTIAL ADDRESS */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Residential Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          placeholder="e.g. 123 Main Street, Sector 4, New Delhi"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: HOSPITAL & CLINICAL CONDITION */}
                  <div className="space-y-4 pt-2">
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        <span>Hospital Branch & Clinical Condition</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose your hospital branch, condition severity, and describe your symptoms.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* HOSPITAL SELECTION */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Hospital Branch *
                        </label>
                        <select
                          name="hospital"
                          value={formData.hospital}
                          onChange={handleChange}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                        >
                          <option value="">-- Select Your Hospital Branch --</option>
                          {hospitals.map((hosp) => (
                            <option key={hosp.id} value={hosp.id}>
                              {hosp.Name || hosp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* CONDITION STATUS */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Condition Severity *
                        </label>
                        <select
                          name="condition"
                          value={formData.condition}
                          onChange={handleChange}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                        >
                          <option value="">-- Select Your Condition Severity --</option>
                          {conditionChoices.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* SYMPTOMS / DIAGNOSIS */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Chief Symptoms / Health Concern *
                        </label>
                        <textarea
                          name="symptoms_diagnosis"
                          rows={3}
                          required
                          placeholder="Describe your symptoms, illness duration or reason for consultation..."
                          value={formData.symptoms_diagnosis}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        ></textarea>
                      </div>

                      {/* ATTACHED DOCUMENT */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Attach Medical Document (Optional)
                        </label>
                        <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50 transition">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                          />
                          {attachedFile && (
                            <p className="text-[11px] text-teal-700 font-semibold mt-1.5 flex items-center gap-1">
                              <span>✓ Attached File:</span>
                              <span className="font-mono">{attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-700/20 transition duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Booking Appointment...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confirm & Book Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
      </main>

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientAppointment;
