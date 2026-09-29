import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const HospitalManagement = ({ currentUser, selectedHospital: propSelectedHospital, setSelectedHospital: propSetSelectedHospital, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [hospitalData, setHospitalData] = useState(null);
  const [assignedAdminInfo, setAssignedAdminInfo] = useState(null);
  const [noHospitalAssigned, setNoHospitalAssigned] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [deptSearch, setDeptSearch] = useState('');
  const [deptCategoryFilter, setDeptCategoryFilter] = useState('ALL');
  const [wardSearch, setWardSearch] = useState('');
  const [wardTypeFilter, setWardTypeFilter] = useState('ALL');
  const [roomSearch, setRoomSearch] = useState('');
  const [bedStatusFilter, setBedStatusFilter] = useState('ALL');

  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [isBedStatusModalOpen, setIsBedStatusModalOpen] = useState(false);
  const [selectedBedToUpdate, setSelectedBedToUpdate] = useState(null);

  const [detailsFormData, setDetailsFormData] = useState({
    Name: '',
    Branch_Code: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    emergency_contact: '',
    email: '',
    total_beds: 0,
    icu_beds: 0,
    nicu_beds: 0,
    operation_theatres: 0,
    ambulances_count: 0,
    restroom_for_relatives: 0,
    is_active: true
  });

  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    category: 'Clinical',
    hod: '',
    hod_phone: '',
    location: '',
    doctors_count: 0,
    nurses_count: 0,
    beds_allocated: 0,
    equipment_count: '',
    status: 'Normal'
  });

  const [wardFormData, setWardFormData] = useState({
    name: '',
    code: '',
    category: 'General',
    floor: '',
    total_beds: 10,
    occupied_beds: 0,
    supervisor: '',
    contact_ext: '',
    sanitization_status: 'Sanitized & Clean',
    status: 'Active'
  });

  const [bedStatusFormData, setBedStatusFormData] = useState({
    status: 'Available',
    patient_name: '',
    patient_id: '',
    doctor: '',
    admission_date: '',
    notes: ''
  });

  const fetchAssignedHospitalData = async () => {
    try {
      setLoading(true);
      setNoHospitalAssigned(false);

      let assignedHospitalId = currentUser?.hospital || propSelectedHospital?.id || null;

      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch (e) {}
      }

      try {
        const adminsRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`);
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
        console.error('Admins fetch error:', e);
      }

      if (!assignedHospitalId) {
        try {
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
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
          console.error('Fallback hospitals fetch error:', e);
        }
      }

      if (!assignedHospitalId) {
        setNoHospitalAssigned(true);
        setHospitalData(null);
        setLoading(false);
        return;
      }

      let targetHosp = null;
      try {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${assignedHospitalId}/`);
        if (hospRes && hospRes.ok) {
          targetHosp = await hospRes.json();
        }
      } catch (e) {
        console.error('Direct hospital fetch error:', e);
      }

      if (!targetHosp) {
        try {
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
          if (allHospRes && allHospRes.ok) {
            const allHosp = await allHospRes.json();
            targetHosp = allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) || allHosp[0] || null;
          }
        } catch (e) {
          console.error('Hospital list fallback error:', e);
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
      console.error('Hospital data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupHospitalAndRelatedData = async (hosp, hospitalId) => {
    try {
      const [docRes, nurRes, recRes, patRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`)
      ]);

      let branchDocs = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const allDocs = await docRes.value.json().catch(() => []);
        branchDocs = allDocs.filter(d => {
          if (Array.isArray(d.hospitals)) return d.hospitals.includes(Number(hospitalId));
          return Number(d.hospital) === Number(hospitalId);
        });
        setDoctorsList(branchDocs);
      }

      let branchNurs = [];
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const allNurs = await nurRes.value.json().catch(() => []);
        branchNurs = allNurs.filter(n => Number(n.hospital) === Number(hospitalId));
        setNursesList(branchNurs);
      }

      let branchRecs = [];
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        branchRecs = allRecs.filter(r => Number(r.hospital) === Number(hospitalId));
        setReceptionistsList(branchRecs);
      }

      let branchPats = [];
      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        const allPats = await patRes.value.json().catch(() => []);
        branchPats = allPats.filter(p => Number(p.hospital) === Number(hospitalId));
        setPatientsList(branchPats);
      }

      const rawDepts = hosp.departments || hosp.department || '';
      let parsedDepts = [];

      if (Array.isArray(rawDepts)) {
        parsedDepts = rawDepts.map((d, index) => {
          const dName = typeof d === 'string' ? d.trim() : (d.name || `Department ${index + 1}`);
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase()));
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: 'Clinical',
            hod: matchingDoc ? matchingDoc.name : '-',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '-') : '-',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length,
            nurses_count: branchNurs.length > 0 ? Math.max(1, Math.floor(branchNurs.length / (rawDepts.length || 1))) : 0,
            beds_allocated: (Number(hosp.total_beds) || 0) > 0 ? Math.floor((Number(hosp.total_beds) || 0) / (rawDepts.length || 1)) : 0,
            equipment_count: '-',
            status: 'Active',
            status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      } else if (typeof rawDepts === 'string' && rawDepts.trim().length > 0) {
        const deptArray = rawDepts.split(',').map(s => s.trim()).filter(Boolean);
        parsedDepts = deptArray.map((dName, index) => {
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase()));
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: 'Clinical',
            hod: matchingDoc ? matchingDoc.name : '-',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '-') : '-',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length,
            nurses_count: branchNurs.length > 0 ? Math.max(1, Math.floor(branchNurs.length / (deptArray.length || 1))) : 0,
            beds_allocated: (Number(hosp.total_beds) || 0) > 0 ? Math.floor((Number(hosp.total_beds) || 0) / (deptArray.length || 1)) : 0,
            equipment_count: '-',
            status: 'Active',
            status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      }

      setDepartmentsList(parsedDepts);

      const totalBedsNum = Number(hosp.total_beds) || 0;
      const icuBedsNum = Number(hosp.icu_beds) || 0;
      const nicuBedsNum = Number(hosp.nicu_beds) || 0;
      const genBedsNum = Math.max(0, totalBedsNum - icuBedsNum - nicuBedsNum);

      const generatedWards = [];

      if (genBedsNum > 0) {
        const genOccupied = Math.min(genBedsNum, branchPats.length);
        generatedWards.push({
          id: 1,
          name: 'General Medical Ward',
          code: 'WRD-GEN-01',
          category: 'General',
          floor: 'Floor 1 - Wing A',
          total_beds: genBedsNum,
          occupied_beds: genOccupied,
          available_beds: Math.max(0, genBedsNum - genOccupied),
          supervisor: branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sanitized & Clean',
          sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          status: 'Active'
        });
      }

      if (icuBedsNum > 0) {
        const icuOccupied = Math.min(icuBedsNum, Math.max(0, branchPats.length - genBedsNum));
        generatedWards.push({
          id: 2,
          name: 'Intensive Care Unit (ICU)',
          code: 'WRD-ICU-02',
          category: 'Intensive Care',
          floor: 'Floor 2 - Wing A',
          total_beds: icuBedsNum,
          occupied_beds: icuOccupied,
          available_beds: Math.max(0, icuBedsNum - icuOccupied),
          supervisor: branchNurs[1]?.name || branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sterilized',
          sanitization_color: 'text-blue-700 bg-blue-50 border-blue-200',
          status: 'Active'
        });
      }

      if (nicuBedsNum > 0) {
        generatedWards.push({
          id: 3,
          name: 'Neonatal ICU (NICU / PICU)',
          code: 'WRD-NICU-03',
          category: 'Pediatric',
          floor: 'Floor 3 - Wing C',
          total_beds: nicuBedsNum,
          occupied_beds: 0,
          available_beds: nicuBedsNum,
          supervisor: branchNurs[2]?.name || branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sterilized',
          sanitization_color: 'text-purple-700 bg-purple-50 border-purple-200',
          status: 'Active'
        });
      }

      setWards(generatedWards);

      const generatedRooms = [];
      if (totalBedsNum > 0) {
        const bedsPerRoom = 4;
        const numRooms = Math.ceil(totalBedsNum / bedsPerRoom);
        let globalBedNumber = 1;

        for (let r = 0; r < numRooms; r++) {
          const roomNum = `Room ${101 + r}`;
          const roomBedsCount = Math.min(bedsPerRoom, totalBedsNum - (r * bedsPerRoom));
          const roomBeds = [];

          for (let b = 0; b < roomBedsCount; b++) {
            const bedNumberText = `Bed ${globalBedNumber}`;
            const bedId = `bed-${globalBedNumber}`;
            const patientIndex = globalBedNumber - 1;
            const currentPatient = branchPats[patientIndex] || null;

            if (currentPatient) {
              roomBeds.push({
                id: bedId,
                bed_number: bedNumberText,
                bed_index: globalBedNumber,
                status: 'Occupied',
                patient_name: currentPatient.name || currentPatient.patient_name || `Patient #${globalBedNumber}`,
                patient_id: currentPatient.patient_id ? `PID-${currentPatient.patient_id}` : (currentPatient.id ? `PID-${currentPatient.id}` : `PID-${100 + globalBedNumber}`),
                patient_phone: currentPatient.phone || currentPatient.contact || '',
                patient_gender: currentPatient.gender || '',
                patient_age: currentPatient.age || '',
                doctor: currentPatient.doctor_name || currentPatient.doctor || (branchDocs[0]?.name || '-'),
                admission_date: currentPatient.admission_date || currentPatient.admit_date || currentPatient.created_at || new Date().toISOString().split('T')[0]
              });
            } else {
              roomBeds.push({
                id: bedId,
                bed_number: bedNumberText,
                bed_index: globalBedNumber,
                status: 'Available',
                patient_name: '',
                patient_id: '',
                patient_phone: '',
                patient_gender: '',
                patient_age: '',
                doctor: '',
                admission_date: ''
              });
            }

            globalBedNumber++;
          }

          const isIcuRoom = (r * bedsPerRoom) >= genBedsNum && (r * bedsPerRoom) < (genBedsNum + icuBedsNum);
          const isNicuRoom = (r * bedsPerRoom) >= (genBedsNum + icuBedsNum);

          generatedRooms.push({
            id: r + 1,
            room_number: roomNum,
            floor: `Floor ${Math.floor(r / 3) + 1}`,
            wing: `Wing ${String.fromCharCode(65 + (r % 3))}`,
            room_type: isIcuRoom ? 'ICU Suite' : isNicuRoom ? 'NICU Suite' : 'General Ward Room',
            tariff_per_day: isIcuRoom ? 10000 : isNicuRoom ? 8000 : 1500,
            ward: isIcuRoom ? 'Intensive Care Unit (ICU)' : isNicuRoom ? 'Neonatal ICU (NICU / PICU)' : 'General Medical Ward',
            amenities: isIcuRoom ? ['Oxygen Supply', 'Cardiac Monitor', 'Ventilator'] : ['Central Oxygen', 'Nurse Call Switch'],
            beds: roomBeds
          });
        }
      }

      setRooms(generatedRooms);

    } catch (err) {
      console.error('Setup error:', err);
    }
  };

  useEffect(() => {
    fetchAssignedHospitalData();
  }, [currentUser?.id, currentUser?.email, currentUser?.hospital]);

  const handleOpenEditDetails = () => {
    if (!hospitalData) return;
    setDetailsFormData({
      Name: hospitalData.Name || '',
      Branch_Code: hospitalData.Branch_Code || '',
      city: hospitalData.city || '',
      area: hospitalData.area || '',
      address: hospitalData.address || '',
      contact: hospitalData.contact || '',
      emergency_contact: hospitalData.emergency_contact || hospitalData.contact || '',
      email: hospitalData.email || '',
      total_beds: Number(hospitalData.total_beds) || 0,
      icu_beds: Number(hospitalData.icu_beds) || 0,
      nicu_beds: Number(hospitalData.nicu_beds) || 0,
      operation_theatres: Number(hospitalData.operation_theatres) || 0,
      ambulances_count: Number(hospitalData.ambulances_count) || 0,
      restroom_for_relatives: Number(hospitalData.restroom_for_relatives) || 0,
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

      const response = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updatedData = await response.json();

      if (response.ok) {
        alert('Hospital details updated successfully!');
        setHospitalData(updatedData);
        if (propSetSelectedHospital) propSetSelectedHospital(updatedData);
        localStorage.setItem('selectedHospital', JSON.stringify(updatedData));
        await setupHospitalAndRelatedData(updatedData, updatedData.id);
        setIsEditDetailsModalOpen(false);
      } else {
        alert('Error: ' + JSON.stringify(updatedData));
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Network error while updating hospital.');
    } finally {
      setSaveLoading(false);
    }
  };

  const syncDepartments = async (newDeptList) => {
    if (!hospitalData || !hospitalData.id) return;
    try {
      const deptNamesString = newDeptList.map(d => d.name).join(', ');
      await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: deptNamesString })
      });
    } catch (err) {
      console.error('Department sync error:', err);
    }
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      code: `DEPT-${Math.floor(100 + Math.random() * 900)}`,
      category: 'Clinical',
      hod: doctorsList[0]?.name || '',
      hod_phone: doctorsList[0]?.contact || doctorsList[0]?.phone || '',
      location: '1st Floor - Wing A',
      doctors_count: 0,
      nurses_count: 0,
      beds_allocated: 0,
      equipment_count: '',
      status: 'Active'
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
      doctors_count: dept.doctors_count || 0,
      nurses_count: dept.nurses_count || 0,
      beds_allocated: dept.beds_allocated || 0,
      equipment_count: dept.equipment_count || '',
      status: dept.status || 'Active'
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
    await syncDepartments(updatedList);
    setIsDeptModalOpen(false);
  };

  const handleDeleteDept = async (id) => {
    if (window.confirm('Are you sure you want to remove this department?')) {
      const updatedList = departmentsList.filter(d => d.id !== id);
      setDepartmentsList(updatedList);
      await syncDepartments(updatedList);
    }
  };

  const handleOpenAddWard = () => {
    setEditingWard(null);
    setWardFormData({
      name: '',
      code: `WRD-${Math.floor(100 + Math.random() * 900)}`,
      category: 'General',
      floor: 'Floor 1 - Wing A',
      total_beds: 10,
      occupied_beds: 0,
      supervisor: nursesList[0]?.name || '',
      contact_ext: hospitalData?.contact ? `Tel: ${hospitalData.contact}` : '',
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
      total_beds: ward.total_beds || 10,
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

  const handleOpenBedStatusModal = (room, bed) => {
    setSelectedBedToUpdate({ roomId: room.id, bed });
    setBedStatusFormData({
      status: bed.status || 'Available',
      patient_name: bed.patient_name || '',
      patient_id: bed.patient_id || '',
      doctor: bed.doctor || (doctorsList[0]?.name || ''),
      admission_date: bed.admission_date || new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsBedStatusModalOpen(true);
  };

  const handleSaveBedStatus = (e) => {
    e.preventDefault();
    if (!selectedBedToUpdate) return;

    const { roomId, bed } = selectedBedToUpdate;
    const isOccupied = bedStatusFormData.status === 'Occupied';

    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          beds: r.beds.map(b => {
            if (b.id === bed.id) {
              return {
                ...b,
                status: isOccupied ? 'Occupied' : 'Available',
                patient_name: isOccupied ? (bedStatusFormData.patient_name || 'Admitted Patient') : '',
                patient_id: isOccupied ? (bedStatusFormData.patient_id || `PID-${b.bed_index || 100}`) : '',
                doctor: isOccupied ? (bedStatusFormData.doctor || (doctorsList[0]?.name || '-')) : '',
                admission_date: isOccupied ? (bedStatusFormData.admission_date || new Date().toISOString().split('T')[0]) : ''
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

  const allBeds = rooms.flatMap(r => r.beds.map(b => ({ ...b, room_number: r.room_number, room_type: r.room_type, floor: r.floor })));
  const totalBedsCount = allBeds.length > 0 ? allBeds.length : (Number(hospitalData?.total_beds) || 0);
  const occupiedBedsCount = allBeds.filter(b => b.status === 'Occupied').length;
  const availableBedsCount = Math.max(0, totalBedsCount - occupiedBedsCount);
  const bedOccupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

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
      r.beds.some(b => 
        (b.patient_name || '').toLowerCase().includes(roomSearch.toLowerCase()) || 
        (b.bed_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.patient_id || '').toLowerCase().includes(roomSearch.toLowerCase())
      );
    const matchesBedStatus = bedStatusFilter === 'ALL' || r.beds.some(b => b.status === bedStatusFilter);
    return matchesSearch && matchesBedStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-base font-bold text-slate-800">Loading...</h3>
        <p className="text-xs text-slate-500 mt-1">Loading hospital records and staff data.</p>
      </div>
    );
  }

  if (noHospitalAssigned || !hospitalData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            No Hospital Branch Assigned Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Super Admin has not yet assigned a hospital facility to your administrator account (<strong>{currentUser?.email || currentUser?.name || 'Admin'}</strong>).
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_dashboard')}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
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
      
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Hospital Branch
              </span>
              {curHosp.Branch_Code && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
                  Code: {curHosp.Branch_Code}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${curHosp.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {curHosp.is_active !== false ? 'Operational (Active)' : 'Inactive'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                Admin: {assignedAdminInfo?.name || currentUser?.name || 'Administrator'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100 flex items-center gap-2">
              {curHosp.Name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {curHosp.address ? curHosp.address : `${curHosp.area ? curHosp.area + ', ' : ''}${curHosp.city || ''}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenEditDetails}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Edit & Update Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Total Registered Beds</p>
            <p className="text-base sm:text-lg font-bold text-white mt-0.5">{curHosp.total_beds || 0} Beds</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">ICU Beds</p>
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
            <p className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5 truncate">{curHosp.contact || curHosp.email || '-'}</p>
          </div>
        </div>
      </div>

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
          Hospital Details
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
          Hospital Profile
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
          Departments
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
          Wards
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
          Rooms & Beds
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'rooms_beds' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {totalBedsCount} Beds
          </span>
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Branch Location & Identity</h3>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Hospital Name</span>
                    <span className="text-sm font-bold text-slate-800">{curHosp.Name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">Branch Code</span>
                      <span className="font-semibold text-slate-800 font-mono">{curHosp.Branch_Code || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">City / Area</span>
                      <span className="font-semibold text-slate-800">{curHosp.area ? `${curHosp.area}, ` : ''}{curHosp.city || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Physical Address</span>
                    <span className="font-medium text-slate-700 leading-relaxed block">{curHosp.address || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Communication Desk</h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Main Contact / Reception</span>
                    <span className="text-sm font-bold text-slate-800">{curHosp.contact || '-'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-500 block text-[10px] uppercase font-bold">Emergency Helpline</span>
                    <span className="text-sm font-bold text-rose-700">{curHosp.emergency_contact || curHosp.contact || '-'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Official Email</span>
                    {curHosp.email ? (
                      <a
                        href={`mailto:${curHosp.email.toLowerCase()}`}
                        title={`Send email to ${curHosp.email}`}
                        className="font-medium text-blue-700 hover:underline block truncate"
                      >
                        {curHosp.email}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Administration Details</h3>
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
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Admin Email</span>
                    {(assignedAdminInfo?.email || currentUser?.email) ? (
                      <a
                        href={`mailto:${(assignedAdminInfo?.email || currentUser?.email).toLowerCase()}`}
                        title={`Send email to ${assignedAdminInfo?.email || currentUser?.email}`}
                        className="font-medium text-blue-700 hover:underline block truncate"
                      >
                        {assignedAdminInfo?.email || currentUser?.email}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-400">-</span>
                    )}
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
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">Admin ID</span>
                      <span className="font-semibold text-purple-700 font-mono">
                        {assignedAdminInfo?.employee_id || (assignedAdminInfo?.id ? `ADM-${assignedAdminInfo.id}` : (currentUser?.employee_id || (currentUser?.id ? `ADM-${currentUser.id}` : `ADM-${curHosp.id}`)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Hospital Capacity & Infrastructure Matrix</h3>
                <p className="text-xs text-slate-500">Hospital infrastructure and capacity summary</p>
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
                <span className="text-xs font-semibold text-slate-400 uppercase block">Total Beds</span>
                <span className="text-lg sm:text-xl font-bold text-blue-900 mt-1 block">{curHosp.total_beds ?? 0}</span>
                <span className="text-[11px] font-semibold text-blue-700">Registered Beds</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">ICU Beds</span>
                <span className="text-lg sm:text-xl font-bold text-rose-900 mt-1 block">{curHosp.icu_beds ?? 0}</span>
                <span className="text-[11px] font-semibold text-rose-700">Critical Units</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">NICU Beds</span>
                <span className="text-lg sm:text-xl font-bold text-purple-900 mt-1 block">{curHosp.nicu_beds ?? 0}</span>
                <span className="text-[11px] font-semibold text-purple-700">Infant Units</span>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">OT Suites</span>
                <span className="text-lg sm:text-xl font-bold text-teal-900 mt-1 block">{curHosp.operation_theatres ?? 0}</span>
                <span className="text-[11px] font-semibold text-teal-700">Operating Theatres</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">Fleet</span>
                <span className="text-lg sm:text-xl font-bold text-amber-900 mt-1 block">{curHosp.ambulances_count ?? 0}</span>
                <span className="text-[11px] font-semibold text-amber-700">Ambulances</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">Restrooms</span>
                <span className="text-lg sm:text-xl font-bold text-indigo-900 mt-1 block">{curHosp.restroom_for_relatives ?? 0}</span>
                <span className="text-[11px] font-semibold text-indigo-700">Relative Lounges</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">Hospital Institutional Profile</h3>
            
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Facility Overview</h4>
                  <p className="leading-relaxed text-slate-700 font-medium">
                    <strong>{curHosp.Name}</strong> is registered under branch code <strong>{curHosp.Branch_Code || 'N/A'}</strong> located in {curHosp.city || 'Central'}.
                  </p>
                  <p className="text-xs text-slate-600">
                    Physical Address: {curHosp.address || `${curHosp.area ? curHosp.area + ', ' : ''}${curHosp.city || '-'}`}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                    <span className="font-bold text-blue-900 text-xs uppercase tracking-wider block mb-1">Contact Details</span>
                    <p className="text-xs text-slate-700"><strong>Helpline:</strong> {curHosp.contact || '-'}</p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      <strong>Email: </strong>
                      {curHosp.email ? (
                        <a href={`mailto:${curHosp.email.toLowerCase()}`} title={`Send email to ${curHosp.email}`} className="text-blue-600 hover:underline font-medium">
                          {curHosp.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5"><strong>Emergency:</strong> {curHosp.emergency_contact || curHosp.contact || '-'}</p>
                  </div>
                  <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-100">
                    <span className="font-bold text-teal-900 text-xs uppercase tracking-wider block mb-1">Administrator In-Charge</span>
                    <p className="text-xs text-slate-700"><strong>Name:</strong> {assignedAdminInfo?.name || currentUser?.name || 'Administrator'}</p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      <strong>Email: </strong>
                      {(assignedAdminInfo?.email || currentUser?.email) ? (
                        <a href={`mailto:${(assignedAdminInfo?.email || currentUser?.email).toLowerCase()}`} title={`Send email to ${assignedAdminInfo?.email || currentUser?.email}`} className="text-blue-600 hover:underline font-medium">
                          {assignedAdminInfo?.email || currentUser?.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5"><strong>Status:</strong> {curHosp.is_active !== false ? 'Active Facility' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 sm:p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Hospital Summary</span>
                  <h4 className="text-sm font-bold text-white mt-1">Staff & Patient Overview</h4>
                  
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-300">Registered Doctors</span>
                      <span className="font-bold text-teal-300 text-sm">{doctorsList.length}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-300">Registered Nurses</span>
                      <span className="font-bold text-indigo-300 text-sm">{nursesList.length}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-300">Receptionists</span>
                      <span className="font-bold text-purple-300 text-sm">{receptionistsList.length}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-300">Admitted Patients</span>
                      <span className="font-bold text-emerald-300 text-sm">{patientsList.length}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                  Hospital ID: <strong className="text-slate-200 font-mono">{curHosp.Branch_Code || `HOSP-${curHosp.id}`}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Clinical Departments</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{departmentsList.length} Registered</span>
            </div>
            
            {departmentsList.length > 0 ? (
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
            ) : (
              <p className="text-xs text-slate-500 mt-3">No departments registered yet.</p>
            )}
          </div>
        </div>
      )}

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
                  className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
              + Add Department
            </button>
          </div>

          {filteredDepartments.length > 0 ? (
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
                        {dept.status || 'Active'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Head / Lead Doctor:</span>
                        <span className="font-bold text-slate-800">{dept.hod || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Location:</span>
                        <span className="font-medium text-slate-700">{dept.location || '-'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block text-xs font-bold text-blue-700">{dept.doctors_count || 0}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">Doctors</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block text-xs font-bold text-teal-700">{dept.nurses_count || 0}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">Nurses</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block text-xs font-bold text-purple-700">{dept.beds_allocated || 0}</span>
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
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <p className="text-sm font-semibold">No departments found.</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add Department" to add departments to this hospital branch.</p>
            </div>
          )}
        </div>
      )}

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
                  className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
              + Add New Ward
            </button>
          </div>

          {filteredWards.length > 0 ? (
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
                          <span className="text-emerald-700 font-bold">{ward.available_beds} Available</span>
                          <span className="text-rose-700 font-bold">{ward.occupied_beds} Occupied</span>
                        </div>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Supervisor In-Charge:</span>
                          <span className="font-bold text-slate-800">{ward.supervisor || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Contact / Extension:</span>
                          <span className="font-semibold text-blue-700">{ward.contact_ext || '-'}</span>
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
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <p className="text-sm font-semibold">No wards configured.</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add New Ward" to create a new ward for this hospital branch.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rooms_beds' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Beds</span>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{totalBedsCount}</p>
              <span className="text-[11px] text-slate-500">Across {rooms.length} Rooms</span>
            </div>
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Available</span>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-1">{availableBedsCount}</p>
              <span className="text-[11px] text-emerald-600">Ready for Admission</span>
            </div>
            <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-rose-700 uppercase">Occupied</span>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-800 mt-1">{occupiedBedsCount}</p>
              <span className="text-[11px] text-rose-600">Admitted Patients</span>
            </div>
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-blue-700 uppercase">Occupancy</span>
              <p className="text-xl sm:text-2xl font-extrabold text-blue-900 mt-1">{bedOccupancyRate}%</p>
              <span className="text-[11px] text-blue-600">Live Hospital Rate</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by Room, Bed Number (e.g. Bed 1), or Patient Name..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bedStatusFilter}
                  onChange={(e) => setBedStatusFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
                >
                  <option value="ALL">All Bed Status</option>
                  <option value="Available">Available Only (Green)</option>
                  <option value="Occupied">Occupied Only (Red)</option>
                </select>
              </div>
            </div>
          </div>

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
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {room.beds.length} Total Beds
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Beds Matrix</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {room.beds.map((bed) => {
                        const isOccupied = bed.status === 'Occupied';
                        const statusBg = isOccupied
                          ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-xs'
                          : 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-xs';

                        return (
                          <div
                            key={bed.id}
                            onClick={() => handleOpenBedStatusModal(room, bed)}
                            className={`p-3.5 rounded-xl border ${statusBg} transition cursor-pointer hover:shadow-md`}
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-black/5">
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900">{bed.bed_number}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isOccupied ? 'bg-rose-200/90 text-rose-800' : 'bg-emerald-200/90 text-emerald-800'
                              }`}>
                                {bed.status}
                              </span>
                            </div>

                            {isOccupied ? (
                              <div className="mt-2.5 space-y-1.5 text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Admitted Patient</span>
                                  <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{bed.patient_name || 'Admitted Patient'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600">
                                  <div>
                                    <span className="text-slate-400 font-semibold block text-[10px]">Patient ID</span>
                                    <span className="font-semibold text-slate-800">{bed.patient_id || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-semibold block text-[10px]">Doctor</span>
                                    <span className="font-semibold text-slate-800 truncate block">{bed.doctor || '-'}</span>
                                  </div>
                                </div>
                                {bed.admission_date && (
                                  <div className="pt-1 text-[10px] text-slate-500">
                                    <span>Admitted on: </span>
                                    <span className="font-semibold text-slate-700">{bed.admission_date}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-4 text-center py-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  Available for Admission
                                </span>
                                <p className="text-[10px] text-emerald-600 mt-1">Click to Allocate Patient &rarr;</p>
                              </div>
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

          {filteredRooms.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <p className="text-sm font-semibold">No beds found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {isEditDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Edit Hospital Details</h3>
                <p className="text-[11px] text-slate-500">Update profile information for #{hospitalData?.id}</p>
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
                  <label className="font-semibold text-slate-700 block mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={detailsFormData.area}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Physical Address</label>
                <textarea
                  rows="2"
                  value={detailsFormData.address}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Main Reception Contact</label>
                  <input
                    type="text"
                    value={detailsFormData.contact}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
                  <input
                    type="email"
                    value={detailsFormData.email}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="font-bold text-slate-800 text-xs block mb-2">Capacity Configuration</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Total Beds</label>
                    <input
                      type="number"
                      min="0"
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
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <option value="Active">Active</option>
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
                    placeholder="e.g. Dr. Name"
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
                  <label className="font-semibold text-slate-700 block mb-1">Extension / Contact</label>
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

      {isBedStatusModalOpen && selectedBedToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Update Bed: {selectedBedToUpdate.bed.bed_number}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bed status & patient admission
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
                <label className="font-semibold text-slate-700 block mb-1.5">Bed Allocation Status *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBedStatusFormData({ ...bedStatusFormData, status: 'Available' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      bedStatusFormData.status === 'Available'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${bedStatusFormData.status === 'Available' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    Available
                  </button>

                  <button
                    type="button"
                    onClick={() => setBedStatusFormData({ ...bedStatusFormData, status: 'Occupied' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      bedStatusFormData.status === 'Occupied'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${bedStatusFormData.status === 'Occupied' ? 'bg-white' : 'bg-rose-500'}`}></span>
                    Occupied
                  </button>
                </div>
              </div>

              {bedStatusFormData.status === 'Occupied' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patient Name"
                      value={bedStatusFormData.patient_name}
                      onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, patient_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Patient ID</label>
                      <input
                        type="text"
                        placeholder="PID-101"
                        value={bedStatusFormData.patient_id}
                        onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, patient_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Admission Date</label>
                    <input
                      type="date"
                      value={bedStatusFormData.admission_date}
                      onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, admission_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
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
