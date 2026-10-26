import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

const Doctors_Management = ({ currentUser, setCurrentPage, setSelectedDoctor }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctorForEdit, setSelectedDoctorForEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDoctorForDelete, setSelectedDoctorForDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(true);

  const getHospitalDepartments = (hospital) => {
    if (!hospital) return [];
    const raw = hospital.departments || hospital.department || '';
    if (Array.isArray(raw)) {
      return raw.map(d => typeof d === 'string' ? d.trim() : (d?.name || '').trim()).filter(Boolean);
    }
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  };

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const specializations = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'General Medicine',
    'Gynecology',
    'Oncology',
    'Psychiatry',
    'General Surgery'
  ];

  const initialFormState = {
    hospital: '',
    name: '',
    doctor_id: '',
    specialization: 'General Medicine',
    department: [],
    Shifts: 'Morning First Shift',
    shift: 'Morning First Shift',
    consultation_fee: '500',
    contact: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: 'On_Duty',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hospRes, docRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`)
      ]);

      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        setHospitalsList(extractArray(hData));
      }

      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const dData = await docRes.value.json().catch(() => []);
        setDoctors(extractArray(dData));
      }
    } catch (err) {
      console.error('Error fetching doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contact || formData.contact.replace(/\D/g, '').length !== 10) {
      alert('Contact phone number must be exactly 10 digits.');
      return;
    }
    if (!formData.email || !formData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert('Email must be a valid @gmail.com address.');
      return;
    }
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      alert('Password and Confirm Password do not match.');
      return;
    }
    if (formData.password && !formData.confirmPassword) {
      alert('Please confirm your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const deptValue = Array.isArray(formData.department)
        ? formData.department.join(', ')
        : (formData.department || '');

      const payload = {
        name: formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`,
        hospital: formData.hospital ? Number(formData.hospital) : null,
        hospitals: formData.hospital ? [Number(formData.hospital)] : [],
        specialization: formData.specialization,
        department: deptValue,
        Shifts: formData.Shifts,
        shift: formData.Shifts,
        opd_timings: formData.Shifts,
        consultation_fee: formData.consultation_fee || '500',
        contact: formData.contact,
        phone: formData.contact,
        email: formData.email,
        password: formData.password || 'Doctor@123',
        status: formData.status || 'On_Duty',
        duty_status: formData.status || 'On_Duty',
        is_active: formData.is_active !== false
      };

      const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData(initialFormState);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || err.message || 'Failed to add doctor');
      }
    } catch (err) {
      console.error('Add doctor error:', err);
      alert('Error creating doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorForEdit) return;
    if (!formData.contact || formData.contact.replace(/\D/g, '').length !== 10) {
      alert('Contact phone number must be exactly 10 digits.');
      return;
    }
    if (!formData.email || !formData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert('Email must be a valid @gmail.com address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const deptValue = Array.isArray(formData.department)
        ? formData.department.join(', ')
        : (formData.department || '');

      const payload = {
        name: formData.name,
        hospital: formData.hospital ? Number(formData.hospital) : null,
        hospitals: formData.hospital ? [Number(formData.hospital)] : [],
        specialization: formData.specialization,
        department: deptValue,
        Shifts: formData.Shifts,
        shift: formData.Shifts,
        opd_timings: formData.Shifts,
        consultation_fee: formData.consultation_fee,
        contact: formData.contact,
        phone: formData.contact,
        email: formData.email,
        status: formData.status,
        duty_status: formData.status,
        is_active: formData.is_active
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${selectedDoctorForEdit.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setSelectedDoctorForEdit(null);
        fetchData();
      } else {
        alert('Failed to update doctor');
      }
    } catch (err) {
      console.error('Update doctor error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedDoctorForDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${selectedDoctorForDelete.id}/`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        setIsDeleteModalOpen(false);
        setSelectedDoctorForDelete(null);
        fetchData();
      } else {
        alert('Failed to delete doctor');
      }
    } catch (err) {
      console.error('Delete doctor error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (doc) => {
    setSelectedDoctorForEdit(doc);
    const docHosp = typeof doc.hospital === 'object' && doc.hospital !== null ? doc.hospital.id : doc.hospital;
    const docHospId = docHosp || (Array.isArray(doc.hospitals) && doc.hospitals[0] ? (typeof doc.hospitals[0] === 'object' ? doc.hospitals[0].id : doc.hospitals[0]) : '');
    const docDepts = Array.isArray(doc.department)
      ? doc.department
      : String(doc.department || doc.departments || '').split(',').map(s => s.trim()).filter(Boolean);

    setFormData({
      hospital: docHospId ? String(docHospId) : '',
      name: doc.name || '',
      doctor_id: doc.doctor_id || (doc.id ? `DOC-${doc.id}` : ''),
      specialization: doc.specialization || 'General Medicine',
      department: docDepts,
      Shifts: doc.Shifts || doc.shift || 'Morning First Shift',
      shift: doc.Shifts || doc.shift || 'Morning First Shift',
      consultation_fee: doc.consultation_fee || '500',
      contact: doc.contact || doc.phone || '',
      email: doc.email || '',
      password: doc.password || '',
      confirmPassword: '',
      status: doc.status || doc.duty_status || 'On_Duty',
      is_active: doc.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (doc) => {
    if (setSelectedDoctor) setSelectedDoctor(doc);
    try {
      localStorage.setItem('selectedDoctor', JSON.stringify(doc));
    } catch (e) {}
    if (setCurrentPage) setCurrentPage('doctor_details');
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase().trim();
    const docName = (doc.name || '').toLowerCase();
    const docEmail = (doc.email || '').toLowerCase();
    const docContact = (doc.contact || doc.phone || '').toLowerCase();
    const docSpec = (doc.specialization || '').toLowerCase();
    const docId = `${doc.doctor_id || ''} ${doc.id || ''}`.toLowerCase();

    const matchesSearch =
      !term ||
      docName.includes(term) ||
      docEmail.includes(term) ||
      docContact.includes(term) ||
      docSpec.includes(term) ||
      docId.includes(term);

    const doctorHospitalIds = [
      ...(Array.isArray(doc.hospitals) ? doc.hospitals.map((hospital) => typeof hospital === 'object' && hospital !== null ? hospital.id : hospital) : []),
      ...(Array.isArray(doc.hospital_names) ? doc.hospital_names.map((hospital) => hospital?.id) : []),
      ...(doc.hospital ? [typeof doc.hospital === 'object' ? doc.hospital.id : doc.hospital] : [])
    ].filter((id) => id !== undefined && id !== null).map(String);
    const matchesHosp = hospitalFilter === 'ALL' || doctorHospitalIds.includes(String(hospitalFilter));

    const dShift = doc.Shifts || doc.shift || '';
    const matchesShift = shiftFilter === 'ALL' || dShift === shiftFilter;

    const dStatus = String(doc.status || doc.duty_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On_Duty' && (dStatus.includes('on') || dStatus === 'active')) ||
      (statusFilter === 'Off_Duty' && (dStatus.includes('off') || dStatus.includes('leave')));

    return matchesSearch && matchesHosp && matchesShift && matchesStatus;
  });

  const onDutyCount = doctors.filter(d => !String(d.status || d.duty_status || '').toLowerCase().includes('off') && !String(d.status || '').toLowerCase().includes('leave')).length;
  const offDutyCount = doctors.length - onDutyCount;

  const selectedHospForForm = hospitalsList.find(h => Number(h.id) === Number(formData.hospital));
  const availableDeptsForForm = getHospitalDepartments(selectedHospForForm);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Doctors Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage hospital medical staff, duty shifts, and specializations
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span>+ Add New Doctor</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Doctors</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{doctors.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">All registered doctors</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">On Duty Doctors</p>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{onDutyCount}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Currently active</p>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs bg-gradient-to-br from-rose-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Off Duty / On Leave</p>
          <h3 className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{offDutyCount}</h3>
          <p className="text-xs text-rose-700/80 mt-0.5 font-medium">Off duty doctors</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-2xs bg-gradient-to-br from-sky-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Hospitals</p>
          <h3 className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">{hospitalsList.length}</h3>
          <p className="text-xs text-sky-700/80 mt-0.5 font-medium">Affiliated branches</p>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pb-3 border-b border-slate-100 flex-wrap">
          <input
            type="text"
            placeholder="Search doctor by name, specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="ALL">All Hospitals</option>
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>{h.Name || h.name}</option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            {shiftsList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="ALL">All Duty Statuses</option>
            <option value="On_Duty">On Duty</option>
            <option value="Off_Duty">Off Duty / On Leave</option>
          </select>
        </div>

        {/* ACTIVE FILTER TAGS */}
        <ActiveFilterTags
          filters={[
            { name: 'Search', value: searchTerm.trim(), onRemove: () => setSearchTerm('') },
            {
              name: 'Hospital',
              value: hospitalFilter,
              displayValue: hospitalsList.find((h) => String(h.id) === String(hospitalFilter))?.Name || hospitalFilter,
              onRemove: () => setHospitalFilter('ALL'),
            },
            { name: 'Shift', value: shiftFilter, onRemove: () => setShiftFilter('ALL') },
            {
              name: 'Status',
              value: statusFilter,
              displayValue: statusFilter === 'On_Duty' ? 'On Duty' : statusFilter === 'Off_Duty' ? 'Off Duty / On Leave' : statusFilter,
              onRemove: () => setStatusFilter('ALL'),
            },
          ]}
          onClearAll={() => {
            setSearchTerm('');
            setHospitalFilter('ALL');
            setShiftFilter('ALL');
            setStatusFilter('ALL');
          }}
        />

        {/* Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading doctors directory...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 font-semibold">No doctors found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
                <tr>
                  <th className="py-3 px-3 text-center">DOCTOR NAME &amp; ID</th>
                  <th className="py-3 px-3">Specialization</th>
                  <th className="py-3 px-3">Hospital</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3">Duty Status</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.slice(0, visibleCount).map((doc) => {
                  const doctorStatus = String(doc.status || doc.duty_status || '').replaceAll('_', ' ') || '-';
                  const doctorStatusKey = doctorStatus.toLowerCase();
                  const isOff = doctorStatusKey.includes('off') || doctorStatusKey.includes('leave');
                  const isAvailable = doctorStatusKey.includes('on') || doctorStatusKey === 'active' || doctorStatusKey === 'available';
                  const doctorHospitalIds = [
                    ...(Array.isArray(doc.hospitals) ? doc.hospitals.map((hospital) => typeof hospital === 'object' && hospital !== null ? hospital.id : hospital) : []),
                    ...(Array.isArray(doc.hospital_names) ? doc.hospital_names.map((hospital) => hospital?.id) : []),
                    ...(doc.hospital ? [typeof doc.hospital === 'object' ? doc.hospital.id : doc.hospital] : [])
                  ].filter((id) => id !== undefined && id !== null).map(String);
                  const doctorHospitalNames = Array.isArray(doc.hospital_names)
                    ? doc.hospital_names.map((hospital) => hospital?.name).filter(Boolean)
                    : [];
                  const hospName = doctorHospitalNames.length
                    ? doctorHospitalNames.join(', ')
                    : doctorHospitalIds.map((id) => {
                      const hospital = hospitalsList.find((item) => String(item.id) === id);
                      return hospital?.Name || hospital?.name;
                    }).filter(Boolean).join(', ') || '-';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-3 text-center font-bold text-slate-800">
                        <div className="flex flex-col items-center gap-1">
                          <span>{doc.name || '-'}</span>
                          <span className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-sky-700">
                            {doc.doctor_id || (doc.id ? `DOC-${doc.id}` : '-')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {doc.specialization && doc.specialization !== '-' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {doc.specialization}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{hospName}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {doc.Shifts || doc.shift || '-'}
                      </td>
                      <td className="py-3 px-3">
                        {doctorStatus && doctorStatus !== '-' ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            isOff ? 'bg-rose-50 text-rose-700 border-rose-200' : isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOff ? 'bg-rose-500' : isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {doctorStatus}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {doc.contact || doc.phone || doc.email || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(doc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctorForDelete(doc);
                              setIsDeleteModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Add New Doctor</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Hospital Branch *</label>
                  <select
                    required
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value, department: [] })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.id}>{h.Name || h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Departments based on Selected Hospital */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-semibold">
                      Departments {availableDeptsForForm.length > 0 && <span className="text-slate-400 font-normal">({availableDeptsForForm.length} available)</span>}
                    </label>
                    {Array.isArray(formData.department) && formData.department.length > 0 && (
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {formData.department.length} selected
                      </span>
                    )}
                  </div>

                  {!formData.hospital ? (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-center text-xs">
                      Please select a hospital branch above to view its clinical departments.
                    </div>
                  ) : availableDeptsForForm.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 text-amber-700 text-center text-xs">
                      No departments configured for this hospital branch yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border border-slate-300 bg-slate-50 max-h-36 overflow-y-auto">
                      {availableDeptsForForm.map((dept) => {
                        const isChecked = Array.isArray(formData.department) && formData.department.includes(dept);
                        return (
                          <label
                            key={dept}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                              isChecked
                                ? 'bg-teal-50 border-teal-400 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = Array.isArray(formData.department) ? formData.department : [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, department: [...current, dept] });
                                } else {
                                  setFormData({ ...formData, department: current.filter(d => d !== dept) });
                                }
                              }}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <span className="truncate">{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Specialization *</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    {specializations.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Duty Shift *</label>
                  <select
                    value={formData.Shifts}
                    onChange={(e) => setFormData({ ...formData, Shifts: e.target.value, shift: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    {shiftsList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Duty Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="On_Duty">On Duty</option>
                    <option value="Off_Duty">Off Duty / On Leave</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    placeholder="10 digit mobile"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                    title="Email must be a valid @gmail.com address"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter login password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-2.5 pr-12 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-semibold text-xs cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm login password"
                      value={formData.confirmPassword || ''}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full p-2.5 pr-12 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-semibold text-xs cursor-pointer"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Edit Doctor Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Hospital Branch</label>
                  <select
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value, department: [] })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.id}>{h.Name || h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Departments based on Selected Hospital */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-semibold">
                      Departments {availableDeptsForForm.length > 0 && <span className="text-slate-400 font-normal">({availableDeptsForForm.length} available)</span>}
                    </label>
                    {Array.isArray(formData.department) && formData.department.length > 0 && (
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {formData.department.length} selected
                      </span>
                    )}
                  </div>

                  {!formData.hospital ? (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-center text-xs">
                      Please select a hospital branch above to view its clinical departments.
                    </div>
                  ) : availableDeptsForForm.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 text-amber-700 text-center text-xs">
                      No departments configured for this hospital branch yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border border-slate-300 bg-slate-50 max-h-36 overflow-y-auto">
                      {availableDeptsForForm.map((dept) => {
                        const isChecked = Array.isArray(formData.department) && formData.department.includes(dept);
                        return (
                          <label
                            key={dept}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                              isChecked
                                ? 'bg-teal-50 border-teal-400 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = Array.isArray(formData.department) ? formData.department : [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, department: [...current, dept] });
                                } else {
                                  setFormData({ ...formData, department: current.filter(d => d !== dept) });
                                }
                              }}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <span className="truncate">{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    {specializations.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Duty Shift</label>
                  <select
                    value={formData.Shifts}
                    onChange={(e) => setFormData({ ...formData, Shifts: e.target.value, shift: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    {shiftsList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Duty Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="On_Duty">On Duty</option>
                    <option value="Off_Duty">Off Duty / On Leave</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    placeholder="10 digit mobile"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                    title="Email must be a valid @gmail.com address"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-semibold">Doctor Password</label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Read Only
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      readOnly
                      tabIndex={-1}
                      value={formData.password || selectedDoctorForEdit?.password || 'Doctor@123'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed select-all focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDoctorForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Delete Doctor Account</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-800">{selectedDoctorForDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors_Management;
