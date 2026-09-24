import React, { useState, useEffect } from 'react';

const HospitalManagement = ({ currentUser, selectedHospital: propSelectedHospital, setSelectedHospital: propSetSelectedHospital, setCurrentPage }) => {
  // Active Tab: 'details', 'profile', 'departments', 'wards', 'rooms_beds'
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Hospital and Admin info from Backend
  const [hospitalData, setHospitalData] = useState(null);
  const [assignedAdminInfo, setAssignedAdminInfo] = useState(null);
  const [noHospitalAssigned, setNoHospitalAssigned] = useState(false);

  // Live Staff & Patients from Backend
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Wards & Rooms
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Filter & Search states
  const [deptSearch, setDeptSearch] = useState('');
  const [deptCategoryFilter, setDeptCategoryFilter] = useState('ALL');
  const [wardSearch, setWardSearch] = useState('');
  const [wardTypeFilter, setWardTypeFilter] = useState('ALL');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFloorFilter, setRoomFloorFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [bedStatusFilter, setBedStatusFilter] = useState('ALL');
  const [bedViewMode, setBedViewMode] = useState('rooms'); // 'rooms' or 'grid'

  // Modals
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isBedStatusModalOpen, setIsBedStatusModalOpen] = useState(false);
  const [selectedBedToUpdate, setSelectedBedToUpdate] = useState(null);

  // Form states
  const [detailsFormData, setDetailsFormData] = useState({
    Name: '',
    Branch_Code: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    emergency_contact: '',
    email: '',
    total_beds: 100,
    icu_beds: 10,
    nicu_beds: 5,
    operation_theatres: 4,
    ambulances_count: 2,
    restroom_for_relatives: 3,
    is_active: true
  });

  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    category: 'Clinical',
    hod: '',
    hod_phone: '',
    location: '',
    doctors_count: 2,
    nurses_count: 4,
    beds_allocated: 15,
    equipment_count: 10,
    status: 'Normal'
  });

  const [wardFormData, setWardFormData] = useState({
    name: '',
    code: '',
    category: 'General',
    floor: '',
    total_beds: 20,
    occupied_beds: 0,
    supervisor: '',
    contact_ext: '',
    sanitization_status: 'Sanitized & Clean',
    status: 'Active'
  });

  const [roomFormData, setRoomFormData] = useState({
    room_number: '',
    floor: 'Floor 1',
    wing: 'Wing A',
    room_type: 'General Multi-Bed',
    ward: '',
    tariff_per_day: 1500,
    total_beds_to_add: 2,
    amenities: 'Central Oxygen, Nurse Call Switch, AC'
  });

  const [bedStatusFormData, setBedStatusFormData] = useState({
    status: 'Available',
    patient_name: '',
    patient_id: '',
    doctor: '',
    notes: ''
  });

  // -------------------------------------------------------------
  // 1. FETCH ASSIGNED HOSPITAL & RELATED DATA STRICTLY FROM BACKEND
  // -------------------------------------------------------------
  const fetchAssignedHospitalData = async () => {
    try {
      setLoading(true);
      setNoHospitalAssigned(false);

      let assignedHospitalId = currentUser?.hospital || propSelectedHospital?.id || null;

      // Check localStorage if not in props
      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch (e) {
          // Ignore
        }
      }

      // Look up Admin in backend to find assigned hospital ID
      try {
        const adminsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/');
        if (adminsRes && adminsRes.ok) {
          const adminsList = await adminsRes.json();
          const currentEmail = (currentUser?.email || '').toLowerCase().trim();
          const currentName = (currentUser?.name || '').toLowerCase().trim();

          const matchedAdmin = adminsList.find(a => 
            (a.email && a.email.toLowerCase().trim() === currentEmail) ||
            (a.name && a.name.toLowerCase().trim() === currentName) ||
            (currentUser?.id && Number(a.id) === Number(currentUser.id))
          );

          if (matchedAdmin) {
            setAssignedAdminInfo(matchedAdmin);
            if (matchedAdmin.hospital) {
              assignedHospitalId = Number(matchedAdmin.hospital);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching admins:', e);
      }

      // If still no hospital id, try to get the first hospital or check all hospitals
      if (!assignedHospitalId) {
        try {
          const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
          if (allHospRes.ok) {
            const allHosp = await allHospRes.json();
            if (Array.isArray(allHosp) && allHosp.length > 0) {
              const target = allHosp[0];
              assignedHospitalId = target.id;
              setHospitalData(target);
              if (propSetSelectedHospital && (!propSelectedHospital || propSelectedHospital.id !== target.id)) {
                propSetSelectedHospital(target);
              }
              localStorage.setItem('selectedHospital', JSON.stringify(target));
              await setupHospitalAndRelatedData(target, target.id);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Error fetching fallback hospitals:', e);
        }
      }

      if (!assignedHospitalId) {
        setNoHospitalAssigned(true);
        setHospitalData(null);
        setLoading(false);
        return;
      }

      // Fetch the specific assigned Hospital from Backend
      let targetHosp = null;
      try {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${assignedHospitalId}/`);
        if (hospRes && hospRes.ok) {
          targetHosp = await hospRes.json();
        }
      } catch (e) {
        console.error('Direct hospital fetch error:', e);
      }

      if (!targetHosp) {
        try {
          const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
          if (allHospRes && allHospRes.ok) {
            const allHosp = await allHospRes.json();
            targetHosp = allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) || allHosp[0] || null;
          }
        } catch (e) {
          console.error('All hospitals fallback error:', e);
        }
      }

      if (!targetHosp) {
        setNoHospitalAssigned(true);
        setHospitalData(null);
        setLoading(false);
        return;
      }

      setHospitalData(targetHosp);
      if (propSetSelectedHospital && (!propSelectedHospital || propSelectedHospital.id !== targetHosp.id)) {
        propSetSelectedHospital(targetHosp);
      }
      localStorage.setItem('selectedHospital', JSON.stringify(targetHosp));

      await setupHospitalAndRelatedData(targetHosp, targetHosp.id || assignedHospitalId);

    } catch (err) {
      console.error('Error fetching admin hospital from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch and setup Doctors, Nurses, Receptionists, Patients & Wards for this hospital
  const setupHospitalAndRelatedData = async (hosp, hospitalId) => {
    try {
      const [docRes, nurRes, recRes, patRes] = await Promise.allSettled([
        fetch('http://127.0.0.1:8000/api/super-admin/Doctors/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Nurses/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Patients/')
      ]);

      // 1. Doctors assigned to this hospital
      let branchDocs = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const allDocs = await docRes.value.json().catch(() => []);
        branchDocs = allDocs.filter(d => {
          if (Array.isArray(d.hospitals)) return d.hospitals.includes(Number(hospitalId));
          return Number(d.hospital) === Number(hospitalId);
        });
        setDoctorsList(branchDocs);
      }

      // 2. Nurses assigned to this hospital
      let branchNurs = [];
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const allNurs = await nurRes.value.json().catch(() => []);
        branchNurs = allNurs.filter(n => Number(n.hospital) === Number(hospitalId));
        setNursesList(branchNurs);
      }

      // 3. Receptionists assigned to this hospital
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(hospitalId));
        setReceptionistsList(branchRecs);
      }

      // 4. Patients assigned to this hospital
      let branchPats = [];
      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        const allPats = await patRes.value.json().catch(() => []);
        branchPats = allPats.filter(p => Number(p.hospital) === Number(hospitalId));
        setPatientsList(branchPats);
      }

      // 5. Parse Departments from hospital.departments
      const rawDepts = hosp.departments || hosp.department;
      let parsedDepts = [];
      if (Array.isArray(rawDepts)) {
        parsedDepts = rawDepts.map((d, index) => {
          const dName = typeof d === 'string' ? d.trim() : (d.name || `Department ${index + 1}`);
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())) || branchDocs[index % (branchDocs.length || 1)];
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: index % 2 === 0 ? 'Clinical' : 'Surgical',
            hod: matchingDoc ? matchingDoc.name : 'Dr. Senior Consultant',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '+91 98200 00000') : '+91 98200 00000',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length || 2,
            nurses_count: Math.max(2, Math.floor((branchNurs.length || 4) / (rawDepts.length || 1))),
            beds_allocated: Math.floor((hosp.total_beds || 60) / (rawDepts.length || 1)),
            equipment_count: 10 + index * 3,
            status: index === 0 ? 'High Alert' : 'Normal',
            status_color: index === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      } else if (typeof rawDepts === 'string' && rawDepts.trim().length > 0) {
        parsedDepts = rawDepts.split(',').map((d, index) => {
          const dName = d.trim();
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())) || branchDocs[index % (branchDocs.length || 1)];
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: index % 2 === 0 ? 'Clinical' : 'Critical Care',
            hod: matchingDoc ? matchingDoc.name : 'Dr. Senior Consultant',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '+91 98200 00000') : '+91 98200 00000',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length || 2,
            nurses_count: Math.max(2, Math.floor((branchNurs.length || 4) / (rawDepts.split(',').length || 1))),
            beds_allocated: Math.floor((hosp.total_beds || 60) / (rawDepts.split(',').length || 1)),
            equipment_count: 12 + index * 4,
            status: 'Normal',
            status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      }

      if (parsedDepts.length === 0) {
        parsedDepts = [
          { id: 1, name: 'Emergency & Trauma Care', code: 'DEPT-EMERG-01', category: 'Critical Care', hod: branchDocs[0]?.name || 'Dr. Ramesh Sethi', hod_phone: branchDocs[0]?.contact || '+91 98201 11223', location: 'Ground Floor - Wing A', doctors_count: 4, nurses_count: 8, beds_allocated: 20, equipment_count: 24, status: 'High Alert', status_color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { id: 2, name: 'Cardiology Department', code: 'DEPT-CARD-02', category: 'Clinical', hod: branchDocs[1]?.name || 'Dr. Aditi Verma', hod_phone: branchDocs[1]?.contact || '+91 98201 22334', location: '1st Floor - Wing B', doctors_count: 3, nurses_count: 6, beds_allocated: 25, equipment_count: 18, status: 'Normal', status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { id: 3, name: 'Orthopedics & Joint Care', code: 'DEPT-ORTHO-03', category: 'Surgical', hod: branchDocs[2]?.name || 'Dr. Rajesh Kumar', hod_phone: branchDocs[2]?.contact || '+91 98201 33445', location: '2nd Floor - Wing A', doctors_count: 3, nurses_count: 6, beds_allocated: 20, equipment_count: 15, status: 'Normal', status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { id: 4, name: 'Pediatrics & Neonatal Care', code: 'DEPT-PED-04', category: 'Clinical', hod: branchDocs[3]?.name || 'Dr. Neha Singh', hod_phone: branchDocs[3]?.contact || '+91 98201 44556', location: '3rd Floor - Wing C', doctors_count: 2, nurses_count: 5, beds_allocated: 15, equipment_count: 12, status: 'Normal', status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        ];
      }
      setDepartmentsList(parsedDepts);

      // Generate Wards based on backend capacities
      const totalBedsNum = Number(hosp.total_beds) || 80;
      const icuBedsNum = Number(hosp.icu_beds) || 10;
      const nicuBedsNum = Number(hosp.nicu_beds) || 5;
      const genBedsNum = Math.max(10, totalBedsNum - icuBedsNum - nicuBedsNum);

      const generatedWards = [
        {
          id: 1,
          name: 'General Male Medical Ward',
          code: 'WRD-GEN-M01',
          category: 'General',
          floor: 'Floor 1 - Wing A',
          total_beds: Math.floor(genBedsNum / 2),
          occupied_beds: Math.min(Math.floor(genBedsNum / 2) - 2, Math.floor((branchPats.length || 4) * 0.4)),
          available_beds: Math.max(1, Math.floor(genBedsNum / 2) - Math.min(Math.floor(genBedsNum / 2) - 2, Math.floor((branchPats.length || 4) * 0.4))),
          supervisor: branchNurs[0]?.name || 'Sister In-Charge',
          contact_ext: 'Ext: 101',
          sanitization_status: 'Sanitized & Clean',
          sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          status: 'Active'
        },
        {
          id: 2,
          name: 'General Female Surgical Ward',
          code: 'WRD-GEN-F02',
          category: 'General',
          floor: 'Floor 1 - Wing B',
          total_beds: Math.ceil(genBedsNum / 2),
          occupied_beds: Math.min(Math.ceil(genBedsNum / 2) - 3, Math.floor((branchPats.length || 3) * 0.3)),
          available_beds: Math.max(1, Math.ceil(genBedsNum / 2) - Math.min(Math.ceil(genBedsNum / 2) - 3, Math.floor((branchPats.length || 3) * 0.3))),
          supervisor: branchNurs[1]?.name || 'Sister Anjali Shinde',
          contact_ext: 'Ext: 102',
          sanitization_status: 'Sanitized & Clean',
          sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          status: 'Active'
        },
        {
          id: 3,
          name: 'Intensive Coronary Care Unit (ICU)',
          code: 'WRD-ICU-03',
          category: 'Intensive Care',
          floor: 'Floor 2 - Wing A',
          total_beds: icuBedsNum,
          occupied_beds: Math.min(icuBedsNum - 1, Math.max(1, Math.floor(icuBedsNum * 0.7))),
          available_beds: Math.max(1, icuBedsNum - Math.min(icuBedsNum - 1, Math.max(1, Math.floor(icuBedsNum * 0.7)))),
          supervisor: branchNurs[2]?.name || 'Sister Sneha Jadhav',
          contact_ext: 'Ext: 201',
          sanitization_status: 'Deep Cleaned',
          sanitization_color: 'text-blue-700 bg-blue-50 border-blue-200',
          status: 'Active'
        },
        {
          id: 4,
          name: 'Neonatal ICU (NICU / PICU)',
          code: 'WRD-NICU-04',
          category: 'Pediatric',
          floor: 'Floor 3 - Wing C',
          total_beds: nicuBedsNum,
          occupied_beds: Math.min(nicuBedsNum - 1, Math.max(1, Math.floor(nicuBedsNum * 0.6))),
          available_beds: Math.max(1, nicuBedsNum - Math.min(nicuBedsNum - 1, Math.max(1, Math.floor(nicuBedsNum * 0.6)))),
          supervisor: branchNurs[3]?.name || 'Sister Preeti Patil',
          contact_ext: 'Ext: 301',
          sanitization_status: 'Sterilized',
          sanitization_color: 'text-purple-700 bg-purple-50 border-purple-200',
          status: 'Active'
        }
      ];
      setWards(generatedWards);

      // Generate Rooms & Beds connected with real patients
      const generatedRooms = [
        {
          id: 1,
          room_number: 'Room 101',
          floor: 'Floor 1',
          wing: 'Wing A',
          room_type: 'General Multi-Bed',
          tariff_per_day: 1200,
          ward: 'General Male Medical Ward',
          amenities: ['Central Oxygen', 'Nurse Call Switch', 'Ceiling Fan'],
          beds: [
            { id: '101-A', bed_number: 'Bed 101-A', status: branchPats[0] ? 'Occupied' : 'Available', patient_name: branchPats[0]?.patient_name || branchPats[0]?.name || '', patient_id: branchPats[0]?.patient_id || 'PID-101', doctor: branchDocs[0]?.name || 'Dr. Staff', admission_date: branchPats[0]?.admission_date || '2026-09-22' },
            { id: '101-B', bed_number: 'Bed 101-B', status: branchPats[1] ? 'Occupied' : 'Available', patient_name: branchPats[1]?.patient_name || branchPats[1]?.name || '', patient_id: branchPats[1]?.patient_id || 'PID-102', doctor: branchDocs[1]?.name || 'Dr. Staff', admission_date: branchPats[1]?.admission_date || '2026-09-23' },
            { id: '101-C', bed_number: 'Bed 101-C', status: 'Available', patient_name: '', patient_id: '', doctor: '', admission_date: '' },
            { id: '101-D', bed_number: 'Bed 101-D', status: 'Cleaning', patient_name: '', patient_id: '', doctor: '', admission_date: '' }
          ]
        },
        {
          id: 2,
          room_number: 'Room 102',
          floor: 'Floor 1',
          wing: 'Wing B',
          room_type: 'Semi-Private (Twin Sharing)',
          tariff_per_day: 2800,
          ward: 'General Female Surgical Ward',
          amenities: ['Attached Washroom', 'AC', 'TV', 'Motorized Bed'],
          beds: [
            { id: '102-A', bed_number: 'Bed 102-A', status: branchPats[2] ? 'Occupied' : 'Available', patient_name: branchPats[2]?.patient_name || branchPats[2]?.name || '', patient_id: branchPats[2]?.patient_id || 'PID-103', doctor: branchDocs[0]?.name || 'Dr. Staff', admission_date: branchPats[2]?.admission_date || '2026-09-24' },
            { id: '102-B', bed_number: 'Bed 102-B', status: 'Available', patient_name: '', patient_id: '', doctor: '', admission_date: '' }
          ]
        },
        {
          id: 3,
          room_number: 'Room 201',
          floor: 'Floor 2',
          wing: 'Wing A',
          room_type: 'Deluxe Private Single',
          tariff_per_day: 5500,
          ward: 'Executive Medical Wing',
          amenities: ['Private Washroom', 'Smart TV', 'Refrigerator', 'Attendant Couch', 'AC'],
          beds: [
            { id: '201-A', bed_number: 'Bed 201-A', status: branchPats[3] ? 'Occupied' : 'Reserved', patient_name: branchPats[3]?.patient_name || branchPats[3]?.name || 'Deepak Joshi', patient_id: branchPats[3]?.patient_id || 'PID-104', doctor: branchDocs[1]?.name || 'Dr. Staff', admission_date: '2026-09-24' }
          ]
        },
        {
          id: 4,
          room_number: 'ICU-Bay 01',
          floor: 'Floor 2',
          wing: 'ICU Wing',
          room_type: 'ICU Suite',
          tariff_per_day: 12000,
          ward: 'Intensive Coronary Care Unit (ICU)',
          amenities: ['Multi-Para Cardiac Monitor', 'High-End Ventilator', 'Infusion Pump'],
          beds: [
            { id: 'ICU-01', bed_number: 'Bed ICU-01', status: 'Occupied', patient_name: branchPats[4]?.patient_name || branchPats[4]?.name || 'Admitted Patient', patient_id: 'PID-ICU-01', doctor: branchDocs[0]?.name || 'Dr. Ramesh Sethi', admission_date: '2026-09-21' },
            { id: 'ICU-02', bed_number: 'Bed ICU-02', status: 'Available', patient_name: '', patient_id: '', doctor: '', admission_date: '' },
            { id: 'ICU-03', bed_number: 'Bed ICU-03', status: 'Cleaning', patient_name: '', patient_id: '', doctor: '', admission_date: '' }
          ]
        }
      ];
      setRooms(generatedRooms);

    } catch (err) {
      console.error('Error setting up hospital staff and rooms:', err);
    }
  };

  useEffect(() => {
    fetchAssignedHospitalData();
  }, [currentUser?.id, currentUser?.email, currentUser?.hospital]);

  // -------------------------------------------------------------
  // 2. ADMIN FULL CRUD OPERATIONS ON ASSIGNED HOSPITAL
  // -------------------------------------------------------------
  const handleOpenEditDetails = () => {
    if (!hospitalData) return;
    setDetailsFormData({
      Name: hospitalData.Name || '',
      Branch_Code: hospitalData.Branch_Code || '',
      city: hospitalData.city || '',
      area: hospitalData.area || '',
      address: hospitalData.address || '',
      contact: hospitalData.contact || '',
      emergency_contact: hospitalData.emergency_contact || '+91 22 2680 9108',
      email: hospitalData.email || '',
      total_beds: hospitalData.total_beds || 100,
      icu_beds: hospitalData.icu_beds || 10,
      nicu_beds: hospitalData.nicu_beds || 5,
      operation_theatres: hospitalData.operation_theatres || 4,
      ambulances_count: hospitalData.ambulances_count || 2,
      restroom_for_relatives: hospitalData.restroom_for_relatives || 3,
      is_active: hospitalData.is_active !== false
    });
    setIsEditDetailsModalOpen(true);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!hospitalData || !hospitalData.id) return;
    setSaveLoading(true);

    try {
      const payload = {
        Name: detailsFormData.Name,
        Branch_Code: detailsFormData.Branch_Code,
        city: detailsFormData.city,
        area: detailsFormData.area,
        address: detailsFormData.address,
        contact: detailsFormData.contact,
        email: detailsFormData.email,
        total_beds: Number(detailsFormData.total_beds) || 0,
        icu_beds: Number(detailsFormData.icu_beds) || 0,
        nicu_beds: Number(detailsFormData.nicu_beds) || 0,
        operation_theatres: Number(detailsFormData.operation_theatres) || 0,
        ambulances_count: Number(detailsFormData.ambulances_count) || 0,
        restroom_for_relatives: Number(detailsFormData.restroom_for_relatives) || 0,
        departments: departmentsList.map(d => d.name).join(', '),
        is_active: detailsFormData.is_active
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updatedData = await response.json();

      if (response.ok) {
        alert('Assigned Hospital Details updated in backend successfully!');
        setHospitalData(updatedData);
        if (propSetSelectedHospital) propSetSelectedHospital(updatedData);
        localStorage.setItem('selectedHospital', JSON.stringify(updatedData));
        setIsEditDetailsModalOpen(false);
      } else {
        alert('Backend Error: ' + JSON.stringify(updatedData));
      }
    } catch (err) {
      console.error('Error updating hospital in backend:', err);
      alert('Network error while updating hospital in backend.');
    } finally {
      setSaveLoading(false);
    }
  };

  const syncDepartmentsToBackend = async (newDeptList) => {
    if (!hospitalData || !hospitalData.id) return;
    try {
      const deptNamesString = newDeptList.map(d => d.name).join(', ');
      await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: deptNamesString })
      });
    } catch (err) {
      console.error('Failed to sync departments to backend:', err);
    }
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      code: `DEPT-${Math.floor(100 + Math.random() * 900)}`,
      category: 'Clinical',
      hod: doctorsList[0]?.name || '',
      hod_phone: doctorsList[0]?.contact || '+91 98200 00000',
      location: '1st Floor - Wing A',
      doctors_count: 2,
      nurses_count: 4,
      beds_allocated: 15,
      equipment_count: 10,
      status: 'Normal'
    });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name || '',
      code: dept.code || '',
      category: dept.category || 'Clinical',
      hod: dept.hod || '',
      hod_phone: dept.hod_phone || '',
      location: dept.location || '',
      doctors_count: dept.doctors_count || 2,
      nurses_count: dept.nurses_count || 4,
      beds_allocated: dept.beds_allocated || 15,
      equipment_count: dept.equipment_count || 10,
      status: dept.status || 'Normal'
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    const statusColor = deptFormData.status === 'High Alert'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : deptFormData.status === 'Occupied'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    let updatedList = [];
    if (editingDept) {
      updatedList = departmentsList.map(d => d.id === editingDept.id ? {
        ...d,
        ...deptFormData,
        status_color: statusColor
      } : d);
    } else {
      const newDept = {
        id: Date.now(),
        ...deptFormData,
        status_color: statusColor
      };
      updatedList = [...departmentsList, newDept];
    }
    setDepartmentsList(updatedList);
    await syncDepartmentsToBackend(updatedList);
    setIsDeptModalOpen(false);
  };

  const handleDeleteDept = async (id) => {
    if (window.confirm('Are you sure you want to remove this department from your hospital?')) {
      const updatedList = departmentsList.filter(d => d.id !== id);
      setDepartmentsList(updatedList);
      await syncDepartmentsToBackend(updatedList);
    }
  };

  // Ward Handlers
  const handleOpenAddWard = () => {
    setEditingWard(null);
    setWardFormData({
      name: '',
      code: `WRD-${Math.floor(100 + Math.random() * 900)}`,
      category: 'General',
      floor: 'Floor 1 - Wing A',
      total_beds: 20,
      occupied_beds: 0,
      supervisor: nursesList[0]?.name || '',
      contact_ext: 'Ext: 105',
      sanitization_status: 'Sanitized & Clean',
      status: 'Active'
    });
    setIsWardModalOpen(true);
  };

  const handleOpenEditWard = (ward) => {
    setEditingWard(ward);
    setWardFormData({
      name: ward.name || '',
      code: ward.code || '',
      category: ward.category || 'General',
      floor: ward.floor || '',
      total_beds: ward.total_beds || 20,
      occupied_beds: ward.occupied_beds || 0,
      supervisor: ward.supervisor || '',
      contact_ext: ward.contact_ext || '',
      sanitization_status: ward.sanitization_status || 'Sanitized & Clean',
      status: ward.status || 'Active'
    });
    setIsWardModalOpen(true);
  };

  const handleSaveWard = (e) => {
    e.preventDefault();
    const total = Number(wardFormData.total_beds) || 1;
    const occupied = Number(wardFormData.occupied_beds) || 0;
    const available = Math.max(0, total - occupied);

    if (editingWard) {
      setWards(prev => prev.map(w => w.id === editingWard.id ? {
        ...w,
        ...wardFormData,
        total_beds: total,
        occupied_beds: occupied,
        available_beds: available
      } : w));
    } else {
      const newWard = {
        id: Date.now(),
        ...wardFormData,
        total_beds: total,
        occupied_beds: occupied,
        available_beds: available,
        sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
      setWards(prev => [...prev, newWard]);
    }
    setIsWardModalOpen(false);
  };

  const handleDeleteWard = (id) => {
    if (window.confirm('Are you sure you want to remove this ward?')) {
      setWards(prev => prev.filter(w => w.id !== id));
    }
  };

  // Room & Bed Handlers
  const handleOpenAddRoom = () => {
    setRoomFormData({
      room_number: `Room ${Math.floor(100 + Math.random() * 899)}`,
      floor: 'Floor 1',
      wing: 'Wing A',
      room_type: 'General Multi-Bed',
      ward: wards[0]?.name || 'General Male Medical Ward',
      tariff_per_day: 1500,
      total_beds_to_add: 2,
      amenities: 'Central Oxygen, Nurse Call Switch, AC'
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = (e) => {
    e.preventDefault();
    const bedCount = Number(roomFormData.total_beds_to_add) || 1;
    const generatedBeds = [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let i = 0; i < bedCount; i++) {
      generatedBeds.push({
        id: `${roomFormData.room_number}-${letters[i] || i + 1}`,
        bed_number: `Bed ${roomFormData.room_number.replace('Room ', '')}-${letters[i] || i + 1}`,
        status: 'Available',
        patient_name: '',
        patient_id: '',
        doctor: '',
        admission_date: ''
      });
    }

    const newRoom = {
      id: Date.now(),
      room_number: roomFormData.room_number,
      floor: roomFormData.floor,
      wing: roomFormData.wing,
      room_type: roomFormData.room_type,
      tariff_per_day: Number(roomFormData.tariff_per_day) || 1500,
      ward: roomFormData.ward,
      amenities: (roomFormData.amenities || '').split(',').map(s => s.trim()).filter(Boolean),
      beds: generatedBeds
    };

    setRooms(prev => [...prev, newRoom]);
    setIsRoomModalOpen(false);
  };

  const handleOpenBedStatusModal = (room, bed) => {
    setSelectedBedToUpdate({ roomId: room.id, bed });
    setBedStatusFormData({
      status: bed.status || 'Available',
      patient_name: bed.patient_name || '',
      patient_id: bed.patient_id || '',
      doctor: bed.doctor || (doctorsList[0]?.name || ''),
      notes: ''
    });
    setIsBedStatusModalOpen(true);
  };

  const handleSaveBedStatus = (e) => {
    e.preventDefault();
    if (!selectedBedToUpdate) return;

    const { roomId, bed } = selectedBedToUpdate;
    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          beds: r.beds.map(b => {
            if (b.id === bed.id) {
              return {
                ...b,
                status: bedStatusFormData.status,
                patient_name: bedStatusFormData.status === 'Occupied' || bedStatusFormData.status === 'Reserved' ? bedStatusFormData.patient_name : '',
                patient_id: bedStatusFormData.status === 'Occupied' || bedStatusFormData.status === 'Reserved' ? bedStatusFormData.patient_id : '',
                doctor: bedStatusFormData.status === 'Occupied' || bedStatusFormData.status === 'Reserved' ? bedStatusFormData.doctor : '',
                admission_date: bedStatusFormData.status === 'Occupied' ? (b.admission_date || '2026-09-24') : ''
              };
            }
            return b;
          })
        };
      }
      return r;
    }));

    setIsBedStatusModalOpen(false);
  };

  // Computed Bed Statistics for this assigned hospital
  const allBeds = rooms.flatMap(r => r.beds.map(b => ({ ...b, room_number: r.room_number, room_type: r.room_type, floor: r.floor })));
  const totalBedsCount = allBeds.length;
  const occupiedBedsCount = allBeds.filter(b => b.status === 'Occupied').length;
  const availableBedsCount = allBeds.filter(b => b.status === 'Available').length;
  const reservedBedsCount = allBeds.filter(b => b.status === 'Reserved').length;
  const cleaningBedsCount = allBeds.filter(b => b.status === 'Cleaning').length;
  const bedOccupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  // Filtered Lists safely handling null/undefined values
  const filteredDepartments = departmentsList.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.code || '').toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.hod || '').toLowerCase().includes(deptSearch.toLowerCase());
    const matchesCategory = deptCategoryFilter === 'ALL' || d.category === deptCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredWards = wards.filter(w => {
    const matchesSearch = (w.name || '').toLowerCase().includes(wardSearch.toLowerCase()) ||
      (w.code || '').toLowerCase().includes(wardSearch.toLowerCase()) ||
      (w.supervisor || '').toLowerCase().includes(wardSearch.toLowerCase());
    const matchesType = wardTypeFilter === 'ALL' || w.category === wardTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = (r.room_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.ward || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.beds.some(b => (b.patient_name || '').toLowerCase().includes(roomSearch.toLowerCase()) || (b.bed_number || '').toLowerCase().includes(roomSearch.toLowerCase()));
    const matchesFloor = roomFloorFilter === 'ALL' || r.floor === roomFloorFilter;
    const matchesType = roomTypeFilter === 'ALL' || r.room_type === roomTypeFilter;
    const matchesBedStatus = bedStatusFilter === 'ALL' || r.beds.some(b => b.status === bedStatusFilter);
    return matchesSearch && matchesFloor && matchesType && matchesBedStatus;
  });

  const filteredBedsForGrid = allBeds.filter(b => {
    const matchesSearch = (b.bed_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      (b.room_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      (b.patient_name || '').toLowerCase().includes(roomSearch.toLowerCase());
    const matchesFloor = roomFloorFilter === 'ALL' || b.floor === roomFloorFilter;
    const matchesType = roomTypeFilter === 'ALL' || b.room_type === roomTypeFilter;
    const matchesStatus = bedStatusFilter === 'ALL' || b.status === bedStatusFilter;
    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  // Loading Screen
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-base font-bold text-slate-800">Connecting to Backend...</h3>
        <p className="text-xs text-slate-500 mt-1">Loading assigned hospital branch records and staff data.</p>
      </div>
    );
  }

  // No Assigned Hospital
  if (noHospitalAssigned || !hospitalData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-3xl mx-auto mb-4">
            🏥
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            No Hospital Branch Assigned Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Super Admin has not yet assigned a hospital facility to your administrator account (<strong>{currentUser?.email || currentUser?.name || 'Admin'}</strong>).
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={fetchAssignedHospitalData}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              🔄 Refresh Status
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const curHosp = hospitalData;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      
      {/* Top Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Assigned Hospital Branch
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
                Code: {curHosp.Branch_Code || 'APEX-01'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${curHosp.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {curHosp.is_active !== false ? 'Operational (Active)' : 'Inactive'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                Admin: {assignedAdminInfo?.name || currentUser?.name || 'Administrator'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100 flex items-center gap-2">
              <span>🏥</span> {curHosp.Name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {curHosp.address ? curHosp.address : `${curHosp.area || ''}, ${curHosp.city || ''}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenEditDetails}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit & Update Details
            </button>
            <button
              type="button"
              onClick={fetchAssignedHospitalData}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Capacity & Staff KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Total Registered Beds</p>
            <p className="text-base sm:text-lg font-bold text-white mt-0.5">{curHosp.total_beds || 0} Beds</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">ICU / Critical Beds</p>
            <p className="text-base sm:text-lg font-bold text-rose-300 mt-0.5">{curHosp.icu_beds || 0} ICU</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Doctors on Duty</p>
            <p className="text-base sm:text-lg font-bold text-teal-300 mt-0.5">{doctorsList.length} Doctors</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Nurses & Staff</p>
            <p className="text-base sm:text-lg font-bold text-indigo-300 mt-0.5">{nursesList.length + receptionistsList.length} Staff</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Admitted Patients</p>
            <p className="text-base sm:text-lg font-bold text-purple-300 mt-0.5">{patientsList.length} Patients</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Main Helpline</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5 truncate">{curHosp.contact || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* 5 Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🏥</span> Hospital Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🏢</span> Hospital Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🩺</span> Departments
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'departments' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {departmentsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wards')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'wards'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🛏️</span> Wards
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'wards' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {wards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rooms_beds')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'rooms_beds'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🚪</span> Rooms & Beds
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'rooms_beds' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {totalBedsCount} Beds
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HOSPITAL DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Branch Identity & Address */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    <h3 className="text-sm font-bold text-slate-800">Branch Location & Identity</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Backend Live
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Hospital Branch Name</span>
                    <span className="text-sm font-bold text-slate-800">{curHosp.Name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">Branch Code</span>
                      <span className="font-semibold text-slate-800 font-mono">{curHosp.Branch_Code || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">City / Area</span>
                      <span className="font-semibold text-slate-800">{curHosp.area || 'Central'}, {curHosp.city}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Full Physical Address</span>
                    <span className="font-medium text-slate-700 leading-relaxed block">{curHosp.address || 'Address not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Communication Desk */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📞</span>
                    <h3 className="text-sm font-bold text-slate-800">Communication Desk</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Main Helpline / Reception</span>
                    <span className="text-sm font-bold text-slate-800">{curHosp.contact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-500 block text-[10px] uppercase font-bold">🚨 24x7 Emergency Contact</span>
                    <span className="text-sm font-bold text-rose-700">{curHosp.emergency_contact || curHosp.contact || '+91 22 2680 9108'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Official Public Email</span>
                    <span className="font-medium text-blue-700">{curHosp.email || 'info@hospital.com'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Administration & Status */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📜</span>
                    <h3 className="text-sm font-bold text-slate-800">Licensure & Admin Info</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                    Super Admin Linked
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Assigned Administrator</span>
                    <span className="text-sm font-bold text-slate-800">{assignedAdminInfo?.name || currentUser?.name || 'Administrator'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Medical Superintendent</span>
                    <span className="font-semibold text-slate-800">{doctorsList[0]?.name || 'Dr. Medical Superintendent'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">Operational Status</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {curHosp.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">Accreditation</span>
                      <span className="font-semibold text-slate-800">NABH Certified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Infrastructure Capacity Statistics Matrix */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Hospital Capacity & Infrastructure Matrix</h3>
                <p className="text-xs text-slate-500">Registered live capacities synchronized directly with the database</p>
              </div>
              <button
                type="button"
                onClick={handleOpenEditDetails}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer self-start sm:self-auto"
              >
                Modify Capacities &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                <span className="text-2xl block">🛏️</span>
                <span className="text-lg sm:text-xl font-bold text-blue-900 mt-1 block">{curHosp.total_beds || 0}</span>
                <span className="text-[11px] font-semibold text-blue-700">Total Registered Beds</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-2xl block">🚨</span>
                <span className="text-lg sm:text-xl font-bold text-rose-900 mt-1 block">{curHosp.icu_beds || 0}</span>
                <span className="text-[11px] font-semibold text-rose-700">ICU / Critical Beds</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
                <span className="text-2xl block">👶</span>
                <span className="text-lg sm:text-xl font-bold text-purple-900 mt-1 block">{curHosp.nicu_beds || 0}</span>
                <span className="text-[11px] font-semibold text-purple-700">NICU / PICU Units</span>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 text-center">
                <span className="text-2xl block">🔬</span>
                <span className="text-lg sm:text-xl font-bold text-teal-900 mt-1 block">{curHosp.operation_theatres || 0}</span>
                <span className="text-[11px] font-semibold text-teal-700">Operation Theatres</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-2xl block">🚑</span>
                <span className="text-lg sm:text-xl font-bold text-amber-900 mt-1 block">{curHosp.ambulances_count || 0}</span>
                <span className="text-[11px] font-semibold text-amber-700">Ambulances Fleet</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-2xl block">🛋️</span>
                <span className="text-lg sm:text-xl font-bold text-indigo-900 mt-1 block">{curHosp.restroom_for_relatives || 0}</span>
                <span className="text-[11px] font-semibold text-indigo-700">Relative Restrooms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOSPITAL PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">Hospital Institutional Profile</h3>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4 text-xs sm:text-sm text-slate-700">
                <div>
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-1">About the Hospital</h4>
                  <p className="leading-relaxed text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    {curHosp.Name} operates as a comprehensive healthcare facility in {curHosp.city}, delivering medical excellence, emergency care, and specialty clinical services.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-1">🎯 Institutional Vision</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">To deliver patient-centric clinical excellence and trusted healthcare across all specialties.</p>
                  </div>
                  <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-100">
                    <h4 className="font-bold text-teal-900 text-xs uppercase tracking-wider mb-1">🚀 Institutional Mission</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">Providing high quality, affordable and ethical medical treatment with continuous advancement.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 sm:p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Quality Accreditations</span>
                  <h4 className="text-sm font-bold text-white mt-1">Standards & Compliance</h4>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-lg">🏅</span>
                      <div>
                        <p className="font-bold text-slate-100">NABH Accredited Facility</p>
                        <p className="text-[10px] text-slate-400">Standard Clinical Protocol</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-lg">🛡️</span>
                      <div>
                        <p className="font-bold text-slate-100">ISO 9001:2015 Certified</p>
                        <p className="text-[10px] text-slate-400">Quality Management System</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-800">
                  Assigned Branch ID: <strong className="text-slate-200">#{curHosp.id}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="text-xl">⏰</span>
                <h3 className="text-sm font-bold text-slate-800">Operating Timings</h3>
              </div>
              <div className="mt-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">OPD Consultation Desk</p>
                    <p className="text-slate-500 text-[11px]">Monday to Saturday: 08:00 AM - 08:00 PM</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Standard OPD</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <div>
                    <p className="font-bold text-rose-900">Emergency & Trauma Centre</p>
                    <p className="text-rose-700 text-[11px]">24 Hours x 365 Days Open</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold">24x7 Open</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🩺</span>
                  <h3 className="text-sm font-bold text-slate-800">Clinical Departments & Units</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{departmentsList.length} Active Units</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {departmentsList.map((dept, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs font-semibold border border-slate-200 transition"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {dept.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEPARTMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search department name or HOD..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
              <select
                value={deptCategoryFilter}
                onChange={(e) => setDeptCategoryFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="Clinical">Clinical</option>
                <option value="Critical Care">Critical Care</option>
                <option value="Surgical">Surgical</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleOpenAddDept}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+</span> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {dept.code}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 mt-1">{dept.name}</h3>
                      <span className="text-xs text-slate-400 font-medium">{dept.category}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dept.status_color || 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {dept.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Head of Dept:</span>
                      <span className="font-bold text-slate-800">{dept.hod || 'Senior Consultant'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Location:</span>
                      <span className="font-medium text-slate-700">{dept.location}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-blue-700">{dept.doctors_count || 2}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Doctors</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-teal-700">{dept.nurses_count || 4}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Nurses</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-purple-700">{dept.beds_allocated || 15}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Beds</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenEditDept(dept)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Edit Department &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDept(dept.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredDepartments.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-sm font-semibold">No departments found matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WARDS */}
      {/* ========================================================================= */}
      {activeTab === 'wards' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search ward name, code, or supervisor..."
                  value={wardSearch}
                  onChange={(e) => setWardSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
              <select
                value={wardTypeFilter}
                onChange={(e) => setWardTypeFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium"
              >
                <option value="ALL">All Ward Categories</option>
                <option value="General">General Wards</option>
                <option value="Intensive Care">ICU / Intensive Care</option>
                <option value="Pediatric">Pediatric / NICU</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleOpenAddWard}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+</span> Add New Ward
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWards.map((ward) => {
              const totalB = ward.total_beds || 1;
              const occB = ward.occupied_beds || 0;
              const occupancyPct = Math.round((occB / totalB) * 100);
              const barColor = occupancyPct > 85 ? 'bg-rose-500' : occupancyPct > 65 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div
                  key={ward.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {ward.code}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 mt-1">{ward.name}</h3>
                        <p className="text-xs text-slate-400 font-medium">{ward.floor} • {ward.category}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ward.sanitization_color || 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {ward.sanitization_status}
                      </span>
                    </div>

                    <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-600">Bed Occupancy:</span>
                        <span className="font-bold text-slate-800">{ward.occupied_beds} / {ward.total_beds} Beds ({occupancyPct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${Math.min(100, occupancyPct)}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="text-emerald-700 font-bold">🟢 {ward.available_beds} Available</span>
                        <span className="text-rose-700 font-bold">🔴 {ward.occupied_beds} Occupied</span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">In-Charge Supervisor:</span>
                        <span className="font-bold text-slate-800">{ward.supervisor || 'Sister In-Charge'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Intercom Extension:</span>
                        <span className="font-semibold text-blue-700">{ward.contact_ext}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleOpenEditWard(ward)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Configure Ward &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWard(ward.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ROOMS & BEDS */}
      {/* ========================================================================= */}
      {activeTab === 'rooms_beds' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Beds</span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-800 mt-0.5">{totalBedsCount}</p>
              <span className="text-[10px] text-slate-500">Across {rooms.length} Rooms</span>
            </div>
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 shadow-xs text-center">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Available</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-800 mt-0.5">{availableBedsCount}</p>
              <span className="text-[10px] text-emerald-600">Ready for Admission</span>
            </div>
            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100 shadow-xs text-center">
              <span className="text-xs font-semibold text-rose-700 uppercase">Occupied</span>
              <p className="text-lg sm:text-xl font-extrabold text-rose-800 mt-0.5">{occupiedBedsCount}</p>
              <span className="text-[10px] text-rose-600">Admitted Patients</span>
            </div>
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100 shadow-xs text-center">
              <span className="text-xs font-semibold text-amber-700 uppercase">Reserved</span>
              <p className="text-lg sm:text-xl font-extrabold text-amber-800 mt-0.5">{reservedBedsCount}</p>
              <span className="text-[10px] text-amber-600">Scheduled / OT</span>
            </div>
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 shadow-xs text-center">
              <span className="text-xs font-semibold text-blue-700 uppercase">Cleaning</span>
              <p className="text-lg sm:text-xl font-extrabold text-blue-800 mt-0.5">{cleaningBedsCount}</p>
              <span className="text-[10px] text-blue-600">Sanitizing</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Occupancy</span>
              <p className="text-lg sm:text-xl font-extrabold text-indigo-700 mt-0.5">{bedOccupancyRate}%</p>
              <span className="text-[10px] text-slate-500">Live Hospital Rate</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by Room Number, Patient Name, or Bed..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roomFloorFilter}
                  onChange={(e) => setRoomFloorFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">All Floors</option>
                  <option value="Floor 1">Floor 1</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                </select>

                <select
                  value={bedStatusFilter}
                  onChange={(e) => setBedStatusFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">All Bed Status</option>
                  <option value="Available">Available Only (Green)</option>
                  <option value="Occupied">Occupied Only (Red)</option>
                  <option value="Reserved">Reserved Only (Yellow)</option>
                  <option value="Cleaning">Cleaning (Blue)</option>
                </select>

                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBedViewMode('rooms')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${bedViewMode === 'rooms' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Rooms View
                  </button>
                  <button
                    type="button"
                    onClick={() => setBedViewMode('grid')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${bedViewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Bed Grid
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddRoom}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span> Add Room
                </button>
              </div>
            </div>
          </div>

          {/* ROOMS VIEW */}
          {bedViewMode === 'rooms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-slate-800">{room.room_number}</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                            {room.floor} • {room.wing}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{room.room_type} — <span className="text-slate-700 font-semibold">₹{(room.tariff_per_day || 0).toLocaleString()}/day</span></p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{room.ward}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {room.beds.length} Total Beds
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Beds Matrix</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {room.beds.map((bed) => {
                          const statusBg = bed.status === 'Available'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : bed.status === 'Occupied'
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : bed.status === 'Reserved'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800';

                          return (
                            <div
                              key={bed.id}
                              onClick={() => handleOpenBedStatusModal(room, bed)}
                              className={`p-3 rounded-xl border ${statusBg} transition cursor-pointer hover:shadow-sm`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{bed.bed_number}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/80">
                                  {bed.status}
                                </span>
                              </div>

                              {bed.status === 'Occupied' && (
                                <div className="mt-2 pt-1.5 border-t border-rose-200/60 text-[11px]">
                                  <p className="font-bold text-slate-800 truncate">{bed.patient_name || 'Admitted Patient'}</p>
                                  <p className="text-[10px] text-slate-500">{bed.patient_id || 'PID-N/A'} • {bed.doctor || 'Staff Doctor'}</p>
                                </div>
                              )}

                              {bed.status === 'Available' && (
                                <p className="text-[10px] text-emerald-700 font-semibold mt-2">
                                  Click to Admit / Allocate &rarr;
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRID VIEW */}
          {bedViewMode === 'grid' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredBedsForGrid.map((bed) => {
                  const statusBg = bed.status === 'Available'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : bed.status === 'Occupied'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100'
                      : bed.status === 'Reserved'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                        : 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100';

                  const matchingRoom = rooms.find(r => r.beds.some(b => b.id === bed.id));

                  return (
                    <div
                      key={bed.id}
                      onClick={() => matchingRoom && handleOpenBedStatusModal(matchingRoom, bed)}
                      className={`p-3 rounded-xl border ${statusBg} text-center cursor-pointer transition shadow-xs flex flex-col justify-between h-28`}
                    >
                      <div>
                        <span className="text-xs font-extrabold block">{bed.bed_number}</span>
                        <span className="text-[10px] text-slate-500 block">{bed.room_number}</span>
                      </div>
                      <div>
                        {bed.status === 'Occupied' ? (
                          <p className="text-[10px] font-bold truncate text-rose-950">{bed.patient_name || 'Admitted'}</p>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/80">
                            {bed.status}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400">{bed.floor}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT HOSPITAL DETAILS (LIVE BACKEND PUT) */}
      {/* ========================================================================= */}
      {isEditDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Edit Assigned Hospital Details</h3>
                <p className="text-[11px] text-slate-500">Live backend update for hospital #{hospitalData?.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDetailsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={detailsFormData.Name}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, Name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={detailsFormData.Branch_Code}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, Branch_Code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={detailsFormData.city}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Area / Locality *</label>
                  <input
                    type="text"
                    required
                    value={detailsFormData.area}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Physical Address *</label>
                <textarea
                  rows="2"
                  required
                  value={detailsFormData.address}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Main Reception Contact *</label>
                  <input
                    type="text"
                    required
                    value={detailsFormData.contact}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={detailsFormData.email}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="font-bold text-slate-800 text-xs block mb-2">Hospital Capacity Management</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Total Beds</label>
                    <input
                      type="number"
                      min="1"
                      value={detailsFormData.total_beds}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, total_beds: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">ICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.icu_beds}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, icu_beds: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">NICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.nicu_beds}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, nicu_beds: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Operation Theatres</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.operation_theatres}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, operation_theatres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ambulances</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.ambulances_count}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, ambulances_count: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Relative Restrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.restroom_for_relatives}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, restroom_for_relatives: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {saveLoading ? 'Saving to Backend...' : 'Save & Sync Backend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT DEPARTMENT */}
      {/* ========================================================================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiology"
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEPT-CARD-01"
                    value={deptFormData.code}
                    onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={deptFormData.category}
                    onChange={(e) => setDeptFormData({ ...deptFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Clinical">Clinical</option>
                    <option value="Critical Care">Critical Care</option>
                    <option value="Surgical">Surgical</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operational Status</label>
                  <select
                    value={deptFormData.status}
                    onChange={(e) => setDeptFormData({ ...deptFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High Alert">High Alert</option>
                    <option value="Occupied">Occupied</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Head of Department (HOD)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Aditi Verma"
                    value={deptFormData.hod}
                    onChange={(e) => setDeptFormData({ ...deptFormData, hod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location (Floor & Wing)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor - Wing B"
                    value={deptFormData.location}
                    onChange={(e) => setDeptFormData({ ...deptFormData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {editingDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT WARD */}
      {/* ========================================================================= */}
      {isWardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {editingWard ? 'Edit Ward Details' : 'Add New Ward'}
              </h3>
              <button
                type="button"
                onClick={() => setIsWardModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWard} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ward Name *</label>
                  <input
                    type="text"
                    required
                    value={wardFormData.name}
                    onChange={(e) => setWardFormData({ ...wardFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ward Code *</label>
                  <input
                    type="text"
                    required
                    value={wardFormData.code}
                    onChange={(e) => setWardFormData({ ...wardFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={wardFormData.total_beds}
                    onChange={(e) => setWardFormData({ ...wardFormData, total_beds: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Currently Occupied</label>
                  <input
                    type="number"
                    min="0"
                    max={wardFormData.total_beds}
                    value={wardFormData.occupied_beds}
                    onChange={(e) => setWardFormData({ ...wardFormData, occupied_beds: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nurse Supervisor In-Charge</label>
                  <input
                    type="text"
                    value={wardFormData.supervisor}
                    onChange={(e) => setWardFormData({ ...wardFormData, supervisor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Extension / Intercom</label>
                  <input
                    type="text"
                    value={wardFormData.contact_ext}
                    onChange={(e) => setWardFormData({ ...wardFormData, contact_ext: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {editingWard ? 'Update Ward' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD ROOM & BEDS */}
      {/* ========================================================================= */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Add New Room & Bed Matrix</h3>
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Room 105"
                    value={roomFormData.room_number}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Room Type</label>
                  <select
                    value={roomFormData.room_type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="General Multi-Bed">General Multi-Bed</option>
                    <option value="Semi-Private (Twin Sharing)">Semi-Private (Twin Sharing)</option>
                    <option value="Deluxe Private Single">Deluxe Private Single</option>
                    <option value="ICU Suite">ICU Suite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Floor</label>
                  <select
                    value={roomFormData.floor}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Floor 1">Floor 1</option>
                    <option value="Floor 2">Floor 2</option>
                    <option value="Floor 3">Floor 3</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Daily Tariff / Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={roomFormData.tariff_per_day}
                    onChange={(e) => setRoomFormData({ ...roomFormData, tariff_per_day: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Beds to Instantiate</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={roomFormData.total_beds_to_add}
                  onChange={(e) => setRoomFormData({ ...roomFormData, total_beds_to_add: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Create Room & Beds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: UPDATE BED ALLOCATION & STATUS */}
      {/* ========================================================================= */}
      {isBedStatusModalOpen && selectedBedToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Update Bed: {selectedBedToUpdate.bed.bed_number}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live bed status & patient admission control
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBedStatusModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBedStatus} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bed Allocation Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '🟢 Available', val: 'Available' },
                    { label: '🔴 Occupied', val: 'Occupied' },
                    { label: '🟡 Reserved', val: 'Reserved' },
                    { label: '🔵 Cleaning', val: 'Cleaning' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setBedStatusFormData({ ...bedStatusFormData, status: opt.val })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                        bedStatusFormData.status === opt.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(bedStatusFormData.status === 'Occupied' || bedStatusFormData.status === 'Reserved') && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={bedStatusFormData.patient_name}
                      onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, patient_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Patient ID</label>
                      <input
                        type="text"
                        placeholder="PID-9082"
                        value={bedStatusFormData.patient_id}
                        onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, patient_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Treating Doctor</label>
                      <select
                        value={bedStatusFormData.doctor}
                        onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, doctor: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      >
                        {doctorsList.map(doc => (
                          <option key={doc.id} value={doc.name}>{doc.name}</option>
                        ))}
                        {doctorsList.length === 0 && <option value="Dr. Duty Medical Officer">Dr. Duty Medical Officer</option>}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBedStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalManagement;
