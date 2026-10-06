import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientAppointment = ({ setCurrentPage, isLoggedIn, currentUser, onLogout }) => {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Model-aligned Choices
  const bloodGroupChoices = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const conditionChoices = [
    { value: 'Normal', label: 'Normal' },
    { value: 'Urgent', label: 'Urgent' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'Critical', label: 'Critical' }
  ];
  const paymentStatusChoices = [
    { value: 'Pending', label: 'Pending (Pay at Reception Counter)' },
    { value: 'Paid', label: 'Paid (Pre-paid Online / Advance)' },
    { value: 'Partial', label: 'Partial (Partial Deposit Paid)' },
    { value: 'Failed', label: 'Failed (Payment Transaction Failed)' }
  ];
  const paymentMethodChoices = [
    { value: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)' },
    { value: 'Credit Card', label: 'Credit Card / Debit Card' },
    { value: 'Net Banking', label: 'Net Banking' },
    { value: 'Cash', label: 'Cash (Pay at Hospital Counter)' }
  ];
  const statusChoices = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];

  // Default visit date time to tomorrow at 10:00 AM
  const getDefaultVisitDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  // Form State: Patient fields (name, patient_Name, contact, email, address, hospital, blood_group, condition) start empty
  // so nothing is pre-selected and user explicitly selects them
  const [formData, setFormData] = useState({
    // Patient Model Fields (Blank by default)
    name: '',
    patient_Name: '',
    contact: '',
    email: '',
    address: '',
    patient_id: '',

    // Clinical & Hospital Fields (Empty by default)
    hospital: '',
    blood_group: '',
    condition: '',

    // Appointment Model Fields
    doctor: '',
    visit_date_time: getDefaultVisitDateTime(),
    symptoms_diagnosis: '',
    bed_number: '',
    consultation_fee: '0.00',
    hospitals_charges: '0.00',
    amount_paid: '0.00',
    payment_status: 'Pending',
    payment_method: 'Cash',
    status: 'Pending'
  });

  const [attachedFile, setAttachedFile] = useState(null);

  // Helper for Floor Calculation from bed_number (Django @property floor equivalent)
  const getFloorLabel = (bedNum) => {
    if (!bedNum || isNaN(Number(bedNum))) return 'Not Assigned (Outpatient OPD)';
    const floorNumber = Math.floor((Number(bedNum) - 1) / 100) + 1;
    return `Floor ${floorNumber}`;
  };

  // Fetch Hospitals and Doctors list from backend
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes] = await Promise.all([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null)
        ]);

        let hospList = [];
        let docList = [];

        if (hospRes && hospRes.ok) {
          hospList = await hospRes.json().catch(() => []);
        }
        if (docRes && docRes.ok) {
          docList = await docRes.json().catch(() => []);
        }

        if (isMounted) {
          const validHospitals = Array.isArray(hospList) ? hospList : [];
          setHospitals(validHospitals);
          setDoctors(Array.isArray(docList) ? docList : []);
        }
      } catch (err) {
        console.error('Error fetching data in Appointment page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick Action: Autofill logged-in user's own details
  const handleAutofillMyself = () => {
    if (!currentUser) return;
    const currentPatName = currentUser.patient_Name || currentUser.patient_name || currentUser.name || '';
    setFormData(prev => ({
      ...prev,
      name: currentPatName,
      patient_Name: currentPatName,
      contact: currentUser.contact || currentUser.phone || '',
      email: currentUser.email || '',
      address: currentUser.address || '',
      patient_id: currentUser.patient_id || (currentUser.id ? `PAT-${currentUser.id}` : ''),
      blood_group: currentUser.blood_group || currentUser.Blood_Group || prev.blood_group || 'B+'
    }));
  };

  // Quick Action: Clear details to book for family member / another person
  const handleClearPatientInfo = () => {
    setFormData(prev => ({
      ...prev,
      name: '',
      patient_Name: '',
      contact: '',
      email: '',
      address: '',
      patient_id: ''
    }));
  };

  const activeHospital = hospitals.find((h) => String(h.id) === String(formData.hospital)) || hospitals[0] || {};
  const filteredDoctors = formData.hospital
    ? doctors.filter(d => String(typeof d.hospital === 'object' ? d.hospital?.id : d.hospital) === String(formData.hospital))
    : doctors;

  const handleGoToLogin = () => {
    try {
      localStorage.setItem('login_return_page', 'appoint');
    } catch {}
    if (setCurrentPage) {
      setCurrentPage('login');
    }
  };

  const handleGoToSignUp = () => {
    try {
      localStorage.setItem('login_return_page', 'appoint');
    } catch {}
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

  // Submit Handler: Saves the specific entered Patient details and the Appointment
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      alert('Please log in to your account first to book an appointment.');
      handleGoToLogin();
      return;
    }

    if (!formData.hospital) {
      alert('Please select a hospital branch.');
      return;
    }

    const enteredName = (formData.patient_Name || formData.name || '').trim();
    if (!enteredName) {
      alert('Please enter patient full name.');
      return;
    }

    const enteredContact = (formData.contact || currentUser?.contact || currentUser?.phone || '').trim();
    if (!enteredContact) {
      alert('Please enter contact phone number.');
      return;
    }

    const enteredEmail = (formData.email || currentUser?.email || '').trim();
    const patientUhid = (formData.patient_id || currentUser?.patient_id || (currentUser?.id ? `PAT-${currentUser.id}` : '')).trim();

    if (!formData.blood_group) {
      alert('Please select patient blood group.');
      return;
    }

    if (!formData.condition) {
      alert('Please select patient condition severity.');
      return;
    }

    if (!formData.symptoms_diagnosis.trim()) {
      alert('Please enter symptoms or medical diagnosis.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const selectedHospId = Number(formData.hospital);
      const chosenHosp = hospitals.find(h => Number(h.id) === selectedHospId);
      const hospName = chosenHosp?.Name || chosenHosp?.name || activeHospital?.Name || activeHospital?.name || 'Apex Care Hospital';
      const hospAddr = chosenHosp?.Address || chosenHosp?.address || activeHospital?.Address || activeHospital?.address || 'Hospital Branch Campus';
      const hospCity = chosenHosp?.City || chosenHosp?.city || activeHospital?.City || activeHospital?.city || '';

      const selectedDocId = formData.doctor ? Number(formData.doctor) : null;
      const chosenDoc = selectedDocId ? doctors.find(d => Number(d.id) === selectedDocId) : null;
      const docName = chosenDoc ? (chosenDoc.name.startsWith('Dr.') ? chosenDoc.name : `Dr. ${chosenDoc.name}`) : 'Awaiting Receptionist Assignment';

      // ==========================================
      // SAVE DIRECTLY TO APPOINTMENTS TABLE ONLY
      // ==========================================
      const appointmentPayload = {
        // Patient Model Field: patient_Name = models.CharField(max_length=100)
        patient_Name: enteredName,
        patient_name: enteredName,
        name: enteredName,
        hospital: selectedHospId,
        doctor: selectedDocId,
        visit_date_time: formData.visit_date_time ? new Date(formData.visit_date_time).toISOString() : new Date().toISOString(),
        symptoms_diagnosis: formData.symptoms_diagnosis.trim(),
        blood_group: formData.blood_group || 'B+',
        hospitals_charges: parseFloat(formData.hospitals_charges || '0.00'),
        consultation_fee: parseFloat(formData.consultation_fee || '0.00'),
        amount_paid: parseFloat(formData.amount_paid || '0.00'),
        payment_status: formData.payment_status || 'Pending',
        payment_method: formData.payment_method || 'Cash',
        status: formData.status || 'Pending',
        condition: formData.condition || 'Normal',
        bed_number: formData.bed_number ? parseInt(formData.bed_number, 10) : null,
        
        // Demographics & Aliases directly in Appointment record
        hospital_name: hospName,
        doctor_name: docName,
        contact: enteredContact,
        phone: enteredContact,
        email: enteredEmail,
        address: formData.address ? formData.address.trim() : '',
        patient_id: `PAT-${Date.now().toString().slice(-4)}`
      };

      let apptResponse = null;

      if (attachedFile instanceof File) {
        const data = new FormData();
        Object.keys(appointmentPayload).forEach(key => {
          if (appointmentPayload[key] !== null && appointmentPayload[key] !== undefined) {
            data.append(key, appointmentPayload[key]);
          }
        });
        data.append('attached_document', attachedFile);

        apptResponse = await fetch(`${API_BASE_URL}/super-admin/Appointments/`, {
          method: 'POST',
          body: data
        }).catch(() => null);

        if (!apptResponse || !apptResponse.ok) {
          apptResponse = await fetch(`${API_BASE_URL}/super-admin/Appointment/`, {
            method: 'POST',
            body: data
          }).catch(() => null);
        }

        if (!apptResponse || !apptResponse.ok) {
          apptResponse = await fetch(`${API_BASE_URL}/appointments/`, {
            method: 'POST',
            body: data
          }).catch(() => null);
        }
      } else {
        apptResponse = await fetch(`${API_BASE_URL}/super-admin/Appointments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentPayload)
        }).catch(() => null);

        if (!apptResponse || !apptResponse.ok) {
          apptResponse = await fetch(`${API_BASE_URL}/super-admin/Appointment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentPayload)
          }).catch(() => null);
        }

        if (!apptResponse || !apptResponse.ok) {
          apptResponse = await fetch(`${API_BASE_URL}/appointments/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentPayload)
          }).catch(() => null);
        }
      }

      if (!apptResponse || !apptResponse.ok) {
        let serverErrDetail = '';
        if (apptResponse) {
          try {
            const errJson = await apptResponse.json();
            serverErrDetail = errJson.message || errJson.detail || errJson.error;
            if (!serverErrDetail && typeof errJson === 'object') {
              serverErrDetail = Object.entries(errJson)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
                .join('; ');
            }
          } catch {}
        }
        throw new Error(serverErrDetail || 'Unable to connect to hospital backend server. Please try again.');
      }

      let apptData = {};
      try {
        apptData = await apptResponse.json().catch(() => ({}));
      } catch {}

      const assignedUhid = apptData.patient_id || patientUhid || `PAT-${Date.now().toString().slice(-4)}`;
      const assignedToken = `TOKEN-${Math.floor(100 + Math.random() * 900)}`;

      const bookingRecord = {
        ...appointmentPayload,
        ...apptData,
        id: apptData.id || Date.now(),
        uhid: assignedUhid,
        patient_id: assignedUhid,
        token: assignedToken,
        patientName: enteredName,
        patientPhone: enteredContact,
        patientEmail: enteredEmail,
        patientAddress: formData.address,
        hospitalName: hospName,
        hospitalAddress: hospAddr,
        hospitalCity: hospCity,
        doctorName: docName,
        visitDateTime: formData.visit_date_time,
        bloodGroup: formData.blood_group,
        conditionStatus: formData.condition,
        fileName: attachedFile ? attachedFile.name : null,
        floor: getFloorLabel(formData.bed_number)
      };

      try {
        localStorage.setItem('last_booked_appointment', JSON.stringify(bookingRecord));
      } catch (e) {
        console.error('LocalStorage sync error:', e);
      }

      setConfirmedBooking(bookingRecord);

    } catch (err) {
      console.error('Error submitting appointment:', err);
      setSubmitError(err.message || 'Unable to connect to hospital backend server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfirmedBooking(null);
    setAttachedFile(null);
    setFormData({
      name: '',
      patient_Name: '',
      contact: '',
      email: '',
      address: '',
      patient_id: '',
      hospital: '',
      doctor: '',
      visit_date_time: getDefaultVisitDateTime(),
      symptoms_diagnosis: '',
      blood_group: '',
      condition: '',
      bed_number: '',
      consultation_fee: '500.00',
      hospitals_charges: '300.00',
      amount_paid: '0.00',
      payment_status: 'Pending',
      payment_method: 'Cash',
      status: 'Pending'
    });
  };

  const totalBill = (parseFloat(formData.consultation_fee || '0') + parseFloat(formData.hospitals_charges || '0')).toFixed(2);

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
              OPD & Inpatient Appointment Scheduling
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Hospital Appointment Booking
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Book a doctor consultation for yourself or any family member. Fill in the patient's personal name, contact number, and medical symptoms below.
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
                    Appointment Booking Slip • {confirmedBooking.status}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {confirmedBooking.hospitalName}
                  </h3>
                  <p className="text-xs text-slate-500">{confirmedBooking.hospitalAddress} {confirmedBooking.hospitalCity ? `• ${confirmedBooking.hospitalCity}` : ''}</p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold uppercase">
                    ✓ Confirmed
                  </span>
                  <p className="font-mono text-[11px] text-slate-400 mt-1">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* TOKEN & UHID BANNER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider block">
                    Patient UHID (ID)
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-300">
                    {confirmedBooking.uhid}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Condition Severity
                  </span>
                  <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    {confirmedBooking.conditionStatus}
                  </span>
                </div>
              </div>

              {/* DETAILS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient Details</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.patientName}</p>
                  <p className="text-slate-500 text-[11px]">{confirmedBooking.patientPhone} • Blood: {confirmedBooking.bloodGroup}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Doctor & Consultation Slot</span>
                  <p className="font-bold text-slate-900 text-sm">{confirmedBooking.doctorName}</p>
                  <p className="text-slate-500 text-[11px]">
                    🕒 Assigned upon Receptionist Review
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Reception Desk & Triage</span>
                  <p className="font-bold text-teal-900 text-sm">{confirmedBooking.bed_number ? `Bed #${confirmedBooking.bed_number}` : 'OPD Consultation'}</p>
                  <p className="text-slate-500 text-[11px]">Handled by Duty Receptionist</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Symptoms / Medical Diagnosis</span>
                  <p className="text-slate-800 text-xs font-medium">{confirmedBooking.symptoms_diagnosis}</p>
                </div>

                {confirmedBooking.fileName && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-0.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Attached Medical Document</span>
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
          /* ================= APPOINTMENT & PATIENT MODEL BOOKING FORM ================= */
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Appointment Registration Form</h2>
                  <p className="text-xs text-slate-300">Enter patient personal information and select visit parameters.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-400/30">
                    Patient & Appointment
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

                  {/* SECTION 1: PATIENT PERSONAL DETAILS (BLANK BY DEFAULT, CAN ENTER ANY PERSON'S INFO) */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                          <span>Patient Personal Information (Self or Family Member)</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Enter the full name, phone number, and email of the patient visiting the doctor.
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
                        {(formData.name || formData.contact) && (
                          <button
                            type="button"
                            onClick={handleClearPatientInfo}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold cursor-pointer transition"
                            title="Clear patient inputs"
                          >
                            Clear Form
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PATIENT NAME */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Patient Full Name *
                        </label>
                        <input
                          type="text"
                          name="patient_Name"
                          required
                          placeholder="e.g. Ramesh Sharma"
                          value={formData.patient_Name || formData.name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, patient_Name: val, name: val }));
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* PATIENT CONTACT */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Patient Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="contact"
                          required
                          placeholder="e.g. 9876543210"
                          value={formData.contact}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* PATIENT EMAIL */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          placeholder="e.g. patient@gmail.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>

                      {/* RESIDENTIAL ADDRESS */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Residential Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          placeholder="City, Area, House No."
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: CLINICAL DETAILS & HOSPITAL SELECTION */}
                  <div className="space-y-4 pt-2">
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        <span>Clinical Details & Hospital Selection</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select preferred hospital branch, blood group, condition severity, and describe medical symptoms. The duty receptionist will assign the consulting doctor and schedule the appointment.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <option value="">Select Hospital</option>
                          {hospitals.map((hosp) => (
                            <option key={hosp.id} value={hosp.id}>
                              {hosp.Name || hosp.name}
                            </option>
                          ))}
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
                          <option value="">Select Blood</option>
                          {bloodGroupChoices.map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
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
                          <option value="">Select Condition</option>
                          {conditionChoices.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* SYMPTOMS / DIAGNOSIS */}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Chief Symptoms / Diagnosis (symptoms_diagnosis) *
                        </label>
                        <textarea
                          name="symptoms_diagnosis"
                          rows={3}
                          required
                          placeholder="Describe symptoms, illness duration, past medical history or consultation reason..."
                          value={formData.symptoms_diagnosis}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                        ></textarea>
                      </div>

                      {/* ATTACHED DOCUMENT */}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Attached Document (Optional - Prescriptions, Lab Reports)
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
                              <span>✓ File:</span>
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
                          <span>Saving Appointment Records...</span>
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
