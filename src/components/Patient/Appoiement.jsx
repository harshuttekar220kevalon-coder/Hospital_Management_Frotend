import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientAppointment = ({ setCurrentPage, isLoggedIn, currentUser }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Selected State
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [appointmentSlot, setAppointmentSlot] = useState('10:30 AM');
  const [consultationMode, setConsultationMode] = useState('IN_PERSON');

  // Patient Info
  const [patientData, setPatientData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    age: '',
    gender: 'Male',
    bloodGroup: 'O+',
    symptoms: '',
    severity: 'Normal'
  });

  // Confirmed Booking Output
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch Hospitals and Doctors from Backend
  useEffect(() => {
    let isMounted = true;
    const fetchBookingData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`)
        ]);

        let hospList = [];
        let docList = [];

        if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
          hospList = await hospRes.value.json().catch(() => []);
        }
        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          docList = await docRes.value.json().catch(() => []);
        }

        if (isMounted) {
          const validHospitals = Array.isArray(hospList) ? hospList : [];
          const validDoctors = Array.isArray(docList) ? docList : [];
          setHospitals(validHospitals);
          setDoctors(validDoctors);

          // Check if user clicked "Book at Branch" or "Book Doctor" from other pages
          const targetHosp = localStorage.getItem('booking_target_hospital');
          const targetDoc = localStorage.getItem('booking_target_doctor');

          if (targetHosp && validHospitals.some((h) => String(h.id) === String(targetHosp))) {
            setSelectedHospitalId(String(targetHosp));
            localStorage.removeItem('booking_target_hospital');
          } else if (validHospitals.length > 0) {
            setSelectedHospitalId(String(validHospitals[0].id));
          }

          if (targetDoc && validDoctors.some((d) => String(d.id) === String(targetDoc))) {
            setSelectedDoctorId(String(targetDoc));
            localStorage.removeItem('booking_target_doctor');
          }
        }
      } catch (err) {
        console.error('Error fetching appointment form data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBookingData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Doctors by selected Hospital & Department
  const activeHospital = hospitals.find((h) => String(h.id) === String(selectedHospitalId)) || hospitals[0] || {};
  const hospitalDoctors = doctors.filter(
    (d) => !selectedHospitalId || String(d.hospital) === String(selectedHospitalId)
  );

  const availableDepartments = Array.from(
    new Set(
      hospitalDoctors
        .map((d) => d.specialization || d.department)
        .filter((s) => s && typeof s === 'string' && s.trim().length > 0)
    )
  );

  const displayedDoctors = hospitalDoctors.filter((d) => {
    if (selectedDepartment === 'ALL') return true;
    const spec = (d.specialization || d.department || '').toLowerCase();
    return spec.includes(selectedDepartment.toLowerCase());
  });

  const selectedDoctorObj = doctors.find((d) => String(d.id) === String(selectedDoctorId));

  const morningSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
  const afternoonSlots = ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];
  const eveningSlots = ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'];

  // Handle Real Backend POST Submission
  const handleFinalBookingSubmit = async (e) => {
    e.preventDefault();
    if (!patientData.name.trim() || !patientData.phone.trim()) {
      alert('Please enter patient name and contact phone number.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const generatedDocPatId = `PAT-${Date.now().toString().slice(-6)}`;
      const payload = {
        name: patientData.name.trim(),
        email: patientData.email ? patientData.email.trim() : `patient_${Date.now()}@apexcare.com`,
        phone: patientData.phone.trim(),
        contact: patientData.phone.trim(),
        hospital: activeHospital.id ? Number(activeHospital.id) : null,
        doctor: selectedDoctorId ? Number(selectedDoctorId) : null,
        doctor_name: selectedDoctorObj?.name || 'Assigned OPD Specialist',
        specialization: selectedDoctorObj?.specialization || selectedDoctorObj?.department || selectedDepartment || 'General Medicine',
        department: selectedDoctorObj?.specialization || selectedDoctorObj?.department || selectedDepartment || 'General Medicine',
        gender: patientData.gender || 'Male',
        age: patientData.age ? Number(patientData.age) : null,
        Blood_Group: patientData.bloodGroup || 'O+',
        blood_group: patientData.bloodGroup || 'O+',
        symptoms_diagnosis: patientData.symptoms.trim() || 'General Health Checkup & OPD Consultation',
        status: 'Pending',
        is_active: true,
        condation: patientData.severity || 'Normal',
        condition: patientData.severity || 'Normal',
        symptoms_severity: patientData.severity || 'Normal',
        payment_status: 'Paid',
        consultation_fee: selectedDoctorObj?.consultation_fee || selectedDoctorObj?.fee || 500,
        Hospitals_Chargies: 300,
        hospital_charges: 300,
        appointment_date: appointmentDate,
        appointment_time: appointmentSlot,
        visit_date_time: appointmentDate ? `${appointmentDate}T10:00:00` : null
      };

      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(() => null);

      let resData = {};
      if (response && response.ok) {
        resData = await response.json().catch(() => ({}));
      }

      const assignedUhid = resData.patient_id || resData.uhid || resData.id ? `PAT-${resData.id || resData.patient_id}` : generatedDocPatId;
      const assignedToken = `OPD-TK-${Math.floor(100 + Math.random() * 900)}`;

      setConfirmedBooking({
        uhid: assignedUhid,
        token: assignedToken,
        patientName: patientData.name,
        patientPhone: patientData.phone,
        hospitalName: activeHospital.Name || activeHospital.name || 'Hospital Campus',
        hospitalAddress: activeHospital.Address || activeHospital.address || 'Address registered in system',
        hospitalCity: activeHospital.City || activeHospital.city || '',
        doctorName: selectedDoctorObj ? (selectedDoctorObj.name?.startsWith('Dr.') ? selectedDoctorObj.name : `Dr. ${selectedDoctorObj.name}`) : 'Assigned OPD Specialist',
        specialization: selectedDoctorObj?.specialization || selectedDoctorObj?.department || 'General Medicine',
        cabin: selectedDoctorObj?.cabin_number || selectedDoctorObj?.cabin || 'OPD Room',
        appointmentDate: appointmentDate,
        appointmentSlot: appointmentSlot,
        fee: selectedDoctorObj?.consultation_fee || selectedDoctorObj?.fee || 500,
        mode: consultationMode === 'IN_PERSON' ? 'In-Person Hospital Visit' : 'Video Consultation'
      });

      setCurrentStep(4);
    } catch (err) {
      console.error('Error submitting appointment:', err);
      setSubmitError('Backend submission error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setConfirmedBooking(null);
    setSelectedDoctorId('');
    setPatientData({
      name: '',
      phone: '',
      email: '',
      age: '',
      gender: 'Male',
      bloodGroup: 'O+',
      symptoms: '',
      severity: 'Normal'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="appointment"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-10 sm:space-y-14 pb-16">
        {/* HEADER SECTION */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
              Multi-Hospital OPD Portal
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Book OPD Checkup at Your Chosen Hospital Branch
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Select any network hospital campus, choose your specialist doctor, and generate an OPD checkup token to visit the hospital directly.
            </p>
          </div>
        </section>

        {/* STEP PROGRESS BAR */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              <div
                className={`p-2.5 rounded-xl transition ${
                  currentStep === 1
                    ? 'bg-teal-600 text-white'
                    : currentStep > 1
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="block text-[10px] uppercase font-semibold">Step 1</span>
                <span>Branch & Doctor</span>
              </div>

              <div
                className={`p-2.5 rounded-xl transition ${
                  currentStep === 2
                    ? 'bg-teal-600 text-white'
                    : currentStep > 2
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="block text-[10px] uppercase font-semibold">Step 2</span>
                <span>Slot & Mode</span>
              </div>

              <div
                className={`p-2.5 rounded-xl transition ${
                  currentStep === 3
                    ? 'bg-teal-600 text-white'
                    : currentStep > 3
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="block text-[10px] uppercase font-semibold">Step 3</span>
                <span>Patient Info</span>
              </div>

              <div
                className={`p-2.5 rounded-xl transition ${
                  currentStep === 4 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="block text-[10px] uppercase font-semibold">Step 4</span>
                <span>OPD Token Slip</span>
              </div>
            </div>
          </div>
        </section>

        {/* STEP CONTENT CONTAINER */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Connecting to hospital network database...</p>
            </div>
          ) : (
            <>
              {/* ================= STEP 1: HOSPITAL & DOCTOR ================= */}
              {currentStep === 1 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
                  {/* SELECT HOSPITAL */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-base font-bold text-slate-900">
                        1. Select Hospital Branch Campus *
                      </h3>
                      <span className="text-xs font-semibold text-teal-700">
                        {hospitals.length} Campuses Available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {hospitals.map((hosp) => {
                        const isSelected = String(selectedHospitalId) === String(hosp.id);
                        return (
                          <div
                            key={hosp.id}
                            onClick={() => {
                              setSelectedHospitalId(String(hosp.id));
                              setSelectedDoctorId('');
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/30 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 text-[10px] font-bold border border-slate-200 uppercase">
                                {hosp.City || hosp.city || 'Campus'}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">
                                {hosp.Name || hosp.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {hosp.Address || hosp.address}
                              </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-semibold text-teal-800">
                              <span>OPD Available</span>
                              <span className="font-bold">{isSelected ? 'Selected' : 'Click to Pick'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SELECT DEPARTMENT & DOCTOR */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <h3 className="text-base font-bold text-slate-900">
                        2. Select Specialist Doctor (Optional)
                      </h3>

                      {availableDepartments.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-600">Department:</label>
                          <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 focus:outline-none focus:border-teal-600 cursor-pointer"
                          >
                            <option value="ALL">All Departments</option>
                            {availableDepartments.map((dept, idx) => (
                              <option key={idx} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {displayedDoctors.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          General OPD triage will assign the best available physician upon arrival.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          You can still proceed to next step to reserve your OPD checkup slot.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedDoctors.map((doc) => {
                          const isSelected = String(selectedDoctorId) === String(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setSelectedDoctorId(String(doc.id))}
                              className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/30 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 text-[10px] font-bold border border-slate-200 uppercase">
                                    {doc.specialization || doc.department || 'Specialist'}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-slate-800">
                                    ₹{doc.consultation_fee || doc.fee || 500}
                                  </span>
                                </div>

                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    {doc.experience ? `${doc.experience} Years Experience` : 'Senior Physician'}
                                  </p>
                                </div>

                                <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200/50">
                                  <span>Room: {doc.cabin_number || doc.cabin || 'OPD Desk'}</span>
                                </div>
                              </div>

                              <div className="mt-3 text-right">
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}>
                                  {isSelected ? 'Selected Doctor' : 'Select Doctor'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STEP 1 ACTION */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Continue to Slot & Date
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: DATE, TIME & MODE ================= */}
              {currentStep === 2 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Choose OPD Consultation Slot & Date
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hospital: <span className="font-bold text-teal-800">{activeHospital.Name || activeHospital.name}</span>
                      {selectedDoctorObj && ` • Attending Doctor: Dr. ${selectedDoctorObj.name}`}
                    </p>
                  </div>

                  {/* CONSULTATION MODE */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Consultation Format *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setConsultationMode('IN_PERSON')}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          consultationMode === 'IN_PERSON'
                            ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900 block">
                          In-Person Hospital OPD Checkup (Recommended)
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Visit the hospital branch campus with your generated token slip for clinical examination.
                        </p>
                      </div>

                      <div
                        onClick={() => setConsultationMode('VIDEO')}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          consultationMode === 'VIDEO'
                            ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-900 block">
                          Tele-Consultation / Video Call
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Connect with your attending physician remotely via high-definition secure audio/video link.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DATE SELECTOR */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Select Preferred Date *
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* TIME SLOTS */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Select OPD Time Slot *
                    </label>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                          Morning Sessions
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {morningSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setAppointmentSlot(slot)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                appointmentSlot === slot
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                          Afternoon Sessions
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {afternoonSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setAppointmentSlot(slot)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                appointmentSlot === slot
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                          Evening Sessions
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {eveningSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setAppointmentSlot(slot)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                appointmentSlot === slot
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NAVIGATION */}
                  <div className="pt-4 border-t border-slate-200 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Back to Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Continue to Patient Details
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: PATIENT INFORMATION ================= */}
              {currentStep === 3 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Enter Patient Information
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your booking will be saved in the hospital database and registered in the OPD queue.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleFinalBookingSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Patient Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Sharma"
                          value={patientData.name}
                          onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={patientData.phone}
                          onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="patient@gmail.com"
                          value={patientData.email}
                          onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Age (Years)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 38"
                          value={patientData.age}
                          onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Gender
                        </label>
                        <select
                          value={patientData.gender}
                          onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Blood Group
                        </label>
                        <select
                          value={patientData.bloodGroup}
                          onChange={(e) => setPatientData({ ...patientData, bloodGroup: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Condition Severity
                        </label>
                        <select
                          value={patientData.severity}
                          onChange={(e) => setPatientData({ ...patientData, severity: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                        >
                          <option value="Normal">Routine OPD Consultation (Normal)</option>
                          <option value="Moderate">Moderate Symptoms (Needs early check)</option>
                          <option value="Critical">Urgent Medical Attention Required</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Chief Complaints & Symptoms
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Briefly describe health concerns, fever, pain, past prescriptions..."
                        value={patientData.symptoms}
                        onChange={(e) => setPatientData({ ...patientData, symptoms: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>

                    {/* BOOKING SUMMARY BOX */}
                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs space-y-1.5 text-teal-900">
                      <div className="flex justify-between font-semibold">
                        <span>Selected Campus:</span>
                        <span>{activeHospital.Name || activeHospital.name}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Attending Doctor:</span>
                        <span>{selectedDoctorObj?.name || 'General OPD Specialist'}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Date & Time:</span>
                        <span>{appointmentDate} at {appointmentSlot}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-teal-200 text-teal-950">
                        <span>Total Consultation Fee:</span>
                        <span>₹{selectedDoctorObj?.consultation_fee || selectedDoctorObj?.fee || 500} (Pay at OPD Desk)</span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Back to Slot
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-60"
                      >
                        {submitting ? 'Confirming with Hospital Backend...' : 'Confirm Appointment & Generate Slip'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ================= STEP 4: CONFIRMED OPD TOKEN SLIP ================= */}
              {currentStep === 4 && confirmedBooking && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* PRINTABLE SLIP */}
                  <div className="bg-white rounded-3xl border-2 border-teal-600 p-6 sm:p-8 shadow-md space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                          OPD Registration Slip
                        </span>
                        <h3 className="text-xl font-extrabold text-slate-900">
                          {confirmedBooking.hospitalName}
                        </h3>
                        <p className="text-xs text-slate-500">{confirmedBooking.hospitalAddress}</p>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                          Confirmed
                        </span>
                        <p className="font-mono text-xs text-slate-400 mt-1">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* TOKEN BADGE */}
                    <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-teal-400 uppercase font-bold block">
                          OPD Token Number
                        </span>
                        <span className="text-2xl font-extrabold font-mono text-white">
                          {confirmedBooking.token}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Patient UHID / ID
                        </span>
                        <span className="text-base font-bold font-mono text-teal-300">
                          {confirmedBooking.uhid}
                        </span>
                      </div>
                    </div>

                    {/* DETAILS GRID */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          Patient Name
                        </span>
                        <p className="font-bold text-slate-900">{confirmedBooking.patientName}</p>
                        <p className="text-slate-500 text-[11px]">{confirmedBooking.patientPhone}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          Attending Doctor
                        </span>
                        <p className="font-bold text-slate-900">{confirmedBooking.doctorName}</p>
                        <p className="text-teal-700 text-[11px] font-semibold">{confirmedBooking.specialization}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          Date & Reporting Slot
                        </span>
                        <p className="font-bold text-slate-900">{confirmedBooking.appointmentDate}</p>
                        <p className="text-slate-500 text-[11px]">{confirmedBooking.appointmentSlot}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          Consultation Room
                        </span>
                        <p className="font-bold text-slate-900">{confirmedBooking.cabin}</p>
                        <p className="text-slate-500 text-[11px]">{confirmedBooking.mode}</p>
                      </div>
                    </div>

                    {/* INSTRUCTIONS */}
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                      <span className="font-bold block">Important Instructions for Your Hospital Visit:</span>
                      <p>
                        Please arrive 15 minutes before your scheduled slot ({confirmedBooking.appointmentSlot}) at {confirmedBooking.hospitalName}. Present this token at the OPD front desk.
                      </p>
                    </div>
                  </div>

                  {/* SLIP BUTTONS */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      Print OPD Token Slip
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      Book Another OPD Checkup
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientAppointment;
