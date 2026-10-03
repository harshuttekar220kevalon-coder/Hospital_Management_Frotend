import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientContact = ({ setCurrentPage, isLoggedIn, currentUser }) => {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hospitalId: '',
    department: 'General Inquiry',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadContactData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`)
        ]);

        let hospData = [];
        let docData = [];

        if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
          hospData = await hospRes.value.json().catch(() => []);
        }
        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          docData = await docRes.value.json().catch(() => []);
        }

        if (isMounted) {
          const validHospitals = Array.isArray(hospData) ? hospData : [];
          setHospitals(validHospitals);
          setDoctors(Array.isArray(docData) ? docData : []);
          if (validHospitals.length > 0) {
            setSelectedBranchId(validHospitals[0].id);
            setFormData((prev) => ({ ...prev, hospitalId: String(validHospitals[0].id) }));
          }
        }
      } catch (err) {
        console.error('Error loading contact page data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadContactData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeHospital = hospitals.find((h) => Number(h.id) === Number(selectedBranchId)) || hospitals[0] || {};
  const activeHospitalDocs = doctors.filter((d) => Number(d.hospital) === Number(activeHospital.id));

  const dynamicSpecialties = Array.from(
    new Set(
      doctors
        .map((d) => d.specialization || d.department)
        .filter((s) => s && typeof s === 'string' && s.trim().length > 0)
    )
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please enter your full name and phone number.');
      return;
    }
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      hospitalId: hospitals[0] ? String(hospitals[0].id) : '',
      department: 'General Inquiry',
      subject: '',
      message: ''
    });
    setSubmitted(false);
  };

  const faqs = [
    {
      q: 'Can I choose any hospital branch for my OPD checkup and visit directly?',
      a: 'Yes. You can select whichever hospital branch is convenient for you, book an OPD consultation online or over the phone, and visit that specific branch campus.'
    },
    {
      q: 'How do emergency ambulance services work for different branches?',
      a: 'Each network branch maintains a dedicated 24x7 emergency trauma desk and advanced life support ambulances. You can call the branch emergency number directly or dial 1800-273-9000.'
    },
    {
      q: 'Are patient records shared across all network branches?',
      a: 'Yes. Our integrated hospital database allows doctors at any campus to securely access your registered consultation history, symptoms, and previous prescriptions.'
    },
    {
      q: 'Do I need a prior appointment or are walk-ins allowed?',
      a: 'Walk-ins are accepted at the OPD front desk of every branch. However, booking an appointment online ensures minimal waiting time and guaranteed doctor slot availability.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="contact"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        {/* HERO SECTION */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
              Network Contact & Helplines
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Hospital Branch Network & Emergency Directory
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Find addresses, direct OPD helplines, and 24x7 emergency trauma desks for all our hospital campuses. Select a branch below to connect directly with the patient relations team.
            </p>
          </div>
        </section>

        {/* INTERACTIVE BRANCH SELECTOR (LIVE HOSPITALS) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Active Hospital Campuses
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Hospital Branch Directory
              </h2>
              <p className="text-xs text-slate-500">
                Select a campus to view direct OPD contact numbers, emergency helplines, and full location details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeHospital.id) {
                  try {
                    localStorage.setItem('booking_target_hospital', String(activeHospital.id));
                  } catch {}
                }
                setCurrentPage('appoint');
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              Book OPD at Selected Branch
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Loading branch directory from backend...</p>
            </div>
          ) : (
            <>
              {/* BRANCH PILL TABS */}
              <div className="flex flex-wrap gap-2">
                {hospitals.map((h) => {
                  const isActive = Number(selectedBranchId) === Number(h.id);
                  const hospName = h.Name || h.name || `Hospital #${h.id}`;
                  const hospCity = h.City || h.city || '';

                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(h.id);
                        setFormData((prev) => ({ ...prev, hospitalId: String(h.id) }));
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hospCity ? `${hospCity} Campus` : hospName}
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE BRANCH DETAILS CARD */}
              {activeHospital.id && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 uppercase">
                            {activeHospital.City || activeHospital.city || 'Main'} Campus
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            {activeHospital.Beds || activeHospital.total_beds || activeHospital.beds || 0} Beds
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900">
                          {activeHospital.Name || activeHospital.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Tertiary Care Hospital Campus
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
                        <div>
                          <span className="font-bold text-slate-900 block mb-0.5">Campus Address:</span>
                          <p className="leading-relaxed">
                            {activeHospital.Address || activeHospital.address || 'Address registered in database'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                          <span className="font-bold text-slate-500 uppercase text-[10px] block">
                            OPD Schedule
                          </span>
                          <span className="font-bold text-slate-800 block mt-1">
                            Mon - Sat: 08:00 AM - 08:00 PM
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 shadow-2xs">
                          <span className="font-bold text-rose-600 uppercase text-[10px] block">
                            Trauma & Emergency
                          </span>
                          <span className="font-bold text-rose-900 block mt-1">
                            24x7 Round-The-Clock
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BRANCH CONTACT DIRECTORY */}
                    <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                        Direct Branch Helplines
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-[11px] text-slate-400 block">General OPD Desk</span>
                          <a
                            href={`tel:${(activeHospital.Phone || activeHospital.phone || '+91 1800-273-9000').replace(/[^0-9+]/g, '')}`}
                            className="text-sm font-bold text-white hover:text-teal-300 transition"
                          >
                            {activeHospital.Phone || activeHospital.phone || '+91 1800-273-9000'}
                          </a>
                        </div>

                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-[11px] text-rose-300 block">24x7 Emergency Trauma Unit</span>
                          <span className="text-sm font-bold text-rose-400">
                            {activeHospital.Emergency || activeHospital.emergency || '1800-273-9000 / 108'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 block">Hospital Email</span>
                          <span className="font-mono text-slate-300 text-[11px] break-all">
                            {activeHospital.Email || activeHospital.email || 'reception@apexcarehospital.com'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem('booking_target_hospital', String(activeHospital.id));
                          } catch {}
                          setCurrentPage('appoint');
                        }}
                        className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        Schedule OPD Consultation
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* INQUIRY FORM */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="mb-6 space-y-1">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  Direct Branch Communication
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Send a Branch Medical Query or Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Your message will be sent to the patient coordinator at your selected hospital branch.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                    Status: Received
                  </span>
                  <h4 className="text-base font-bold text-emerald-900">
                    Medical Inquiry Routed Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Thank you, <span className="font-bold">{formData.name}</span>. The patient relations coordinator at our campus will contact you at <span className="font-bold">{formData.phone}</span> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-2 px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-xs hover:bg-emerald-800 transition cursor-pointer"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Select Hospital Branch *
                      </label>
                      <select
                        value={formData.hospitalId}
                        onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 cursor-pointer font-medium"
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.Name || h.name} {h.City || h.city ? `(${h.City || h.city})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Department / Service
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 cursor-pointer"
                      >
                        <option value="General Inquiry">General Hospital Inquiry</option>
                        {dynamicSpecialties.map((s, idx) => (
                          <option key={idx} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="TPA Insurance">Cashless Insurance / TPA Desk</option>
                        <option value="Billing & Admission">Hospital Admission & Billing</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="Brief topic of your inquiry..."
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">
                      Your Message / Medical Query
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your query, doctor preference, or admission details..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Submit Query to Selected Branch
                  </button>
                </form>
              )}
            </div>

            {/* QUICK DIRECTORY */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    Quick Reference
                  </span>
                  <h4 className="text-base font-bold text-slate-900">
                    Network Campus Helplines
                  </h4>
                </div>

                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  {hospitals.map((h) => (
                    <div key={h.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {h.City || h.city || 'Central'} Campus
                        </span>
                        <span className="text-[11px] text-slate-500">{h.Name || h.name}</span>
                        <span className="text-[10px] text-slate-400 block">{h.Address || h.address}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <a
                          href={`tel:${(h.Phone || h.phone || '+91 1800-273-9000').replace(/[^0-9+]/g, '')}`}
                          className="font-mono font-bold text-teal-700 text-[11px] block hover:underline"
                        >
                          {h.Phone || h.phone || '+91 1800-273-9000'}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQS */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 uppercase tracking-wider">
              Network FAQs
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Hospital Communication FAQs
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full text-left px-5 py-4 font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 font-bold ml-2">{isOpen ? '-' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientContact;
