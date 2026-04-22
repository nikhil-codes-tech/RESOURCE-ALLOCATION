import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clean existing data ──
  await prisma.chatMessage.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.taskCheckIn.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.volunteerBadge.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.team.deleteMany();
  await prisma.task.deleteMany();
  await prisma.crisis.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.nGO.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oTPCode.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password@123', 12);

  // ── Admin User ──
  const adminUser = await prisma.user.create({
    data: {
      name: 'Arjun Mehta',
      email: 'admin@ngone.in',
      passwordHash,
      role: 'ADMIN',
      provider: 'EMAIL',
      isVerified: true,
      city: 'New Delhi',
      state: 'Delhi',
      phone: '9876543210',
    },
  });
  console.log('  ✅ Admin user created');

  // ── NGO Coordinators + NGOs ──
  const ngoData = [
    {
      user: { name: 'Priya Sharma', email: 'priya@relieffirst.org', phone: '9812345001', city: 'New Delhi', state: 'Delhi' },
      ngo: { name: 'Relief First Foundation', slug: 'relief-first-foundation', description: 'India\'s premier disaster response organization providing immediate relief during floods, earthquakes, and cyclones across the nation.', city: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090, focusAreas: ['DISASTER_RESPONSE', 'SHELTER'], foundedYear: 2015, darpanId: 'DL/2015/0098765', isDarpanVerified: true, cert80G: true, cert12A: true, impactScore: 87.5, totalFunds: 5000000, fundsUtilised: 4250000, beneficiaries: 125000 },
    },
    {
      user: { name: 'Rajesh Iyer', email: 'rajesh@shikshabharati.org', phone: '9812345002', city: 'Mumbai', state: 'Maharashtra' },
      ngo: { name: 'Shiksha Bharati Trust', slug: 'shiksha-bharati-trust', description: 'Empowering underprivileged children through quality education, digital literacy, and scholarship programmes across rural India.', city: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, focusAreas: ['EDUCATION', 'LIVELIHOOD'], foundedYear: 2012, darpanId: 'MH/2012/0054321', isDarpanVerified: true, cert80G: true, cert12A: true, impactScore: 92.1, totalFunds: 8000000, fundsUtilised: 7200000, beneficiaries: 85000 },
    },
    {
      user: { name: 'Dr. Kavitha Rajan', email: 'kavitha@arogyaseva.org', phone: '9812345003', city: 'Chennai', state: 'Tamil Nadu' },
      ngo: { name: 'Arogya Seva Society', slug: 'arogya-seva-society', description: 'Providing healthcare access to remote villages through mobile medical camps, telemedicine, and health awareness programmes.', city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, focusAreas: ['HEALTHCARE'], foundedYear: 2018, darpanId: 'TN/2018/0076543', isDarpanVerified: true, cert80G: true, cert12A: false, impactScore: 78.3, totalFunds: 3500000, fundsUtilised: 2800000, beneficiaries: 65000 },
    },
    {
      user: { name: 'Sunita Devi', email: 'sunita@mahilashakti.org', phone: '9812345004', city: 'Lucknow', state: 'Uttar Pradesh' },
      ngo: { name: 'Mahila Shakti NGO', slug: 'mahila-shakti-ngo', description: 'Empowering women through skill development, self-help groups, legal aid, and micro-entrepreneurship programmes in UP.', city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, focusAreas: ['WOMEN_EMPOWERMENT', 'LIVELIHOOD'], foundedYear: 2016, darpanId: 'UP/2016/0087654', isDarpanVerified: true, cert80G: true, cert12A: true, impactScore: 81.7, totalFunds: 4200000, fundsUtilised: 3780000, beneficiaries: 45000 },
    },
    {
      user: { name: 'Amit Kulkarni', email: 'amit@kisanmitra.org', phone: '9812345005', city: 'Pune', state: 'Maharashtra' },
      ngo: { name: 'Kisan Mitra', slug: 'kisan-mitra', description: 'Supporting Indian farmers with sustainable agriculture practices, organic farming training, and fair market access.', city: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, focusAreas: ['LIVELIHOOD', 'GRASSROOTS'], foundedYear: 2019, darpanId: 'MH/2019/0043210', isDarpanVerified: true, cert80G: true, cert12A: true, impactScore: 74.8, totalFunds: 2800000, fundsUtilised: 2240000, beneficiaries: 32000 },
    },
  ];

  const ngoRecords = [];
  for (const data of ngoData) {
    const user = await prisma.user.create({
      data: {
        ...data.user,
        passwordHash,
        role: 'NGO_COORDINATOR',
        provider: 'EMAIL',
        isVerified: true,
        country: 'India',
      },
    });
    const ngo = await prisma.nGO.create({
      data: { ...data.ngo, userId: user.id },
    });
    ngoRecords.push({ user, ngo });
  }
  console.log('  ✅ 5 NGOs created');

  // ── Volunteers ──
  const volunteerData = [
    { name: 'Aarav Gupta', email: 'aarav@gmail.com', phone: '9898001001', city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, skills: ['first_aid', 'driving', 'hindi'], points: 3200, level: 'LEGEND' },
    { name: 'Diya Patel', email: 'diya@gmail.com', phone: '9898001002', city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, skills: ['medical', 'counselling', 'english'], points: 2100, level: 'HERO' },
    { name: 'Vihaan Singh', email: 'vihaan@gmail.com', phone: '9898001003', city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, skills: ['rescue', 'swimming', 'first_aid'], points: 1800, level: 'HERO' },
    { name: 'Ananya Reddy', email: 'ananya@gmail.com', phone: '9898001004', city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, skills: ['cooking', 'logistics', 'telugu'], points: 950, level: 'RESPONDER' },
    { name: 'Ishaan Kumar', email: 'ishaan@gmail.com', phone: '9898001005', city: 'Patna', state: 'Bihar', lat: 25.6093, lng: 85.1376, skills: ['teaching', 'hindi', 'distribution'], points: 1500, level: 'HERO' },
    { name: 'Saanvi Nair', email: 'saanvi@gmail.com', phone: '9898001006', city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, skills: ['medical', 'malayalam', 'first_aid'], points: 750, level: 'RESPONDER' },
    { name: 'Aryan Joshi', email: 'aryan@gmail.com', phone: '9898001007', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, skills: ['driving', 'logistics', 'marathi'], points: 420, level: 'ROOKIE' },
    { name: 'Kavya Mishra', email: 'kavya@gmail.com', phone: '9898001008', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, skills: ['counselling', 'teaching', 'hindi'], points: 3500, level: 'LEGEND' },
    { name: 'Rohan Das', email: 'rohan@gmail.com', phone: '9898001009', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, skills: ['rescue', 'first_aid', 'bengali'], points: 2800, level: 'HERO' },
    { name: 'Meera Chopra', email: 'meera@gmail.com', phone: '9898001010', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, skills: ['medical', 'distribution', 'hindi'], points: 1200, level: 'RESPONDER' },
    { name: 'Aditya Rao', email: 'aditya@gmail.com', phone: '9898001011', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, skills: ['technology', 'mapping', 'kannada'], points: 680, level: 'RESPONDER' },
    { name: 'Riya Banerjee', email: 'riya@gmail.com', phone: '9898001012', city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, skills: ['counselling', 'odia', 'cooking'], points: 1650, level: 'HERO' },
    { name: 'Karthik Pillai', email: 'karthik@gmail.com', phone: '9898001013', city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, skills: ['rescue', 'swimming', 'malayalam'], points: 2400, level: 'HERO' },
    { name: 'Pooja Verma', email: 'pooja@gmail.com', phone: '9898001014', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, skills: ['teaching', 'hindi', 'first_aid'], points: 350, level: 'ROOKIE' },
    { name: 'Siddharth Negi', email: 'siddharth@gmail.com', phone: '9898001015', city: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, skills: ['rescue', 'trekking', 'hindi'], points: 4100, level: 'LEGEND' },
    { name: 'Tanya Agarwal', email: 'tanya@gmail.com', phone: '9898001016', city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, skills: ['logistics', 'driving', 'punjabi'], points: 520, level: 'RESPONDER' },
    { name: 'Vikram Thakur', email: 'vikram@gmail.com', phone: '9898001017', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, skills: ['medical', 'gujarati', 'distribution'], points: 890, level: 'RESPONDER' },
    { name: 'Nisha Pandey', email: 'nisha@gmail.com', phone: '9898001018', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, skills: ['teaching', 'cooking', 'hindi'], points: 200, level: 'ROOKIE' },
    { name: 'Rahul Menon', email: 'rahul@gmail.com', phone: '9898001019', city: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368, skills: ['rescue', 'first_aid', 'driving'], points: 1100, level: 'RESPONDER' },
    { name: 'Sneha Kaur', email: 'sneha@gmail.com', phone: '9898001020', city: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, skills: ['counselling', 'punjabi', 'cooking'], points: 600, level: 'RESPONDER' },
  ];

  const volunteerRecords = [];
  for (const v of volunteerData) {
    const user = await prisma.user.create({
      data: {
        name: v.name,
        email: v.email,
        phone: v.phone,
        passwordHash,
        role: 'VOLUNTEER',
        provider: 'EMAIL',
        isVerified: true,
        city: v.city,
        state: v.state,
        country: 'India',
      },
    });
    const volunteer = await prisma.volunteer.create({
      data: {
        userId: user.id,
        skills: v.skills,
        points: v.points,
        level: v.level,
        latitude: v.lat,
        longitude: v.lng,
        isOnline: Math.random() > 0.5,
        isAvailable: true,
        hoursLogged: Math.floor(v.points / 10),
        tasksCompleted: Math.floor(v.points / 50),
        streak: Math.floor(Math.random() * 14),
        lastActiveAt: new Date(),
      },
    });
    volunteerRecords.push({ user, volunteer });
  }
  console.log('  ✅ 20 volunteers created');

  // ── Award badges to top volunteers ──
  const badgeDefinitions = [
    { minPoints: 0, name: 'First Steps', description: 'Joined the NGone family', icon: '👣' },
    { minPoints: 500, name: 'Rising Star', description: 'Earned 500+ points', icon: '⭐' },
    { minPoints: 1000, name: 'Task Master', description: 'Completed 20+ tasks', icon: '🏆' },
    { minPoints: 2000, name: 'Crisis Hero', description: 'Responded to 5+ crises', icon: '🦸' },
    { minPoints: 3000, name: 'Legend', description: 'Achieved Legend status', icon: '👑' },
  ];

  for (const vr of volunteerRecords) {
    const applicableBadges = badgeDefinitions.filter((b) => vr.volunteer.points >= b.minPoints);
    for (const badge of applicableBadges) {
      await prisma.volunteerBadge.create({
        data: {
          volunteerId: vr.volunteer.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
        },
      });
    }
  }
  console.log('  ✅ Volunteer badges awarded');

  // ── Donor Users ──
  const donorUsers = [];
  const donorData = [
    { name: 'Vikash Mittal', email: 'vikash.mittal@gmail.com', phone: '9898002001', city: 'New Delhi', state: 'Delhi' },
    { name: 'Lakshmi Sundaram', email: 'lakshmi.s@gmail.com', phone: '9898002002', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Harpreet Kaur Gill', email: 'harpreet.gill@gmail.com', phone: '9898002003', city: 'Amritsar', state: 'Punjab' },
  ];

  for (const d of donorData) {
    const user = await prisma.user.create({
      data: {
        ...d,
        passwordHash,
        role: 'DONOR',
        provider: 'EMAIL',
        isVerified: true,
        country: 'India',
      },
    });
    const donor = await prisma.donor.create({
      data: { userId: user.id, pan: 'AAAPL' + Math.floor(1000 + Math.random() * 9000) + 'C' },
    });
    donorUsers.push({ user, donor });
  }
  console.log('  ✅ 3 donors created');

  // ── Crises ──
  const crisisData = [
    { ngoIdx: 0, title: 'Assam Floods 2026', slug: 'assam-floods-2026', type: 'FLOOD', urgency: 'EXTREME', lat: 26.1445, lng: 91.7362, location: 'Kamrup, Assam', state: 'Assam', district: 'Kamrup', description: 'Severe flooding affecting 15 districts in Assam. Over 2 lakh people displaced. Immediate rescue and relief needed.', skillsRequired: ['rescue', 'swimming', 'first_aid', 'distribution'], volunteersNeeded: 50, estimatedAffected: 200000 },
    { ngoIdx: 0, title: 'Bihar Food Crisis', slug: 'bihar-food-crisis', type: 'FOOD_SHORTAGE', urgency: 'CRITICAL', lat: 25.6093, lng: 85.1376, location: 'Patna, Bihar', state: 'Bihar', district: 'Patna', description: 'Acute food shortage in rural Bihar districts after failed monsoon. 50,000+ families at risk.', skillsRequired: ['cooking', 'distribution', 'logistics', 'driving'], volunteersNeeded: 30, estimatedAffected: 250000 },
    { ngoIdx: 2, title: 'Rajasthan Medical Camp', slug: 'rajasthan-medical-camp', type: 'MEDICAL', urgency: 'HIGH', lat: 26.9124, lng: 75.7873, location: 'Jaipur, Rajasthan', state: 'Rajasthan', district: 'Jaipur', description: 'Free medical camp for underserved communities in rural Rajasthan. Need doctors, nurses, and support staff.', skillsRequired: ['medical', 'first_aid', 'hindi'], volunteersNeeded: 20, estimatedAffected: 15000 },
    { ngoIdx: 0, title: 'Odisha Cyclone Relief', slug: 'odisha-cyclone-relief', type: 'CYCLONE', urgency: 'EXTREME', lat: 20.2961, lng: 85.8245, location: 'Bhubaneswar, Odisha', state: 'Odisha', district: 'Khordha', description: 'Category 4 cyclone devastated coastal Odisha. Emergency shelter, food, and medical aid required.', skillsRequired: ['rescue', 'first_aid', 'distribution', 'driving'], volunteersNeeded: 60, estimatedAffected: 500000 },
    { ngoIdx: 4, title: 'Maharashtra Drought Support', slug: 'maharashtra-drought-support', type: 'DROUGHT', urgency: 'HIGH', lat: 18.5204, lng: 73.8567, location: 'Marathwada, Maharashtra', state: 'Maharashtra', district: 'Aurangabad', description: 'Severe drought in Marathwada region. Water scarcity affecting farming communities. Need tanker supply coordination.', skillsRequired: ['logistics', 'driving', 'distribution'], volunteersNeeded: 25, estimatedAffected: 100000 },
    { ngoIdx: 0, title: 'Uttarakhand Earthquake Response', slug: 'uttarakhand-earthquake-2026', type: 'EARTHQUAKE', urgency: 'EXTREME', lat: 30.3165, lng: 78.0322, location: 'Dehradun, Uttarakhand', state: 'Uttarakhand', district: 'Dehradun', description: '5.8 magnitude earthquake. Search and rescue operations underway. Need trained volunteers.', skillsRequired: ['rescue', 'trekking', 'first_aid', 'medical'], volunteersNeeded: 40, estimatedAffected: 75000 },
    { ngoIdx: 2, title: 'Chennai Water Crisis', slug: 'chennai-water-crisis', type: 'WATER_CRISIS', urgency: 'CRITICAL', lat: 13.0827, lng: 80.2707, location: 'Chennai, Tamil Nadu', state: 'Tamil Nadu', district: 'Chennai', description: 'Acute water shortage in Chennai metropolitan area. Distribution of clean drinking water needed.', skillsRequired: ['logistics', 'distribution', 'driving'], volunteersNeeded: 35, estimatedAffected: 300000 },
    { ngoIdx: 0, title: 'Gujarat Fire Emergency', slug: 'gujarat-fire-emergency', type: 'FIRE', urgency: 'HIGH', lat: 23.0225, lng: 72.5714, location: 'Ahmedabad, Gujarat', state: 'Gujarat', district: 'Ahmedabad', description: 'Industrial fire in Ahmedabad affecting nearby residential areas. Evacuation and medical support needed.', skillsRequired: ['first_aid', 'medical', 'rescue'], volunteersNeeded: 15, estimatedAffected: 5000 },
    { ngoIdx: 3, title: 'UP Shelter Emergency', slug: 'up-shelter-emergency', type: 'SHELTER', urgency: 'HIGH', lat: 26.8467, lng: 80.9462, location: 'Lucknow, Uttar Pradesh', state: 'Uttar Pradesh', district: 'Lucknow', description: 'Severe cold wave displacing homeless population. Emergency shelter setup needed.', skillsRequired: ['logistics', 'cooking', 'counselling'], volunteersNeeded: 20, estimatedAffected: 10000 },
    { ngoIdx: 2, title: 'Kerala Flood Relief', slug: 'kerala-flood-relief', type: 'FLOOD', urgency: 'CRITICAL', lat: 9.9312, lng: 76.2673, location: 'Kochi, Kerala', state: 'Kerala', district: 'Ernakulam', description: 'Heavy monsoon flooding in central Kerala. Rescue boats and relief camps needed urgently.', skillsRequired: ['rescue', 'swimming', 'first_aid', 'distribution'], volunteersNeeded: 45, estimatedAffected: 180000 },
  ];

  const crisisRecords = [];
  for (const c of crisisData) {
    const crisis = await prisma.crisis.create({
      data: {
        ngoId: ngoRecords[c.ngoIdx].ngo.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        type: c.type,
        urgency: c.urgency,
        latitude: c.lat,
        longitude: c.lng,
        location: c.location,
        state: c.state,
        district: c.district,
        skillsRequired: c.skillsRequired,
        volunteersNeeded: c.volunteersNeeded,
        estimatedAffected: c.estimatedAffected,
        status: 'OPEN',
      },
    });
    crisisRecords.push(crisis);
  }
  console.log('  ✅ 10 crises created');

  // ── Tasks for each crisis ──
  const taskRecords = [];
  for (const crisis of crisisRecords) {
    const task = await prisma.task.create({
      data: {
        crisisId: crisis.id,
        title: `${crisis.title} — Ground Operations`,
        description: `Primary ground operations for ${crisis.title}`,
        status: 'OPEN',
        priority: crisis.urgency === 'EXTREME' ? 5 : crisis.urgency === 'CRITICAL' ? 4 : 3,
      },
    });
    taskRecords.push(task);
  }
  console.log('  ✅ Tasks created for crises');

  // ── Teams ──
  const teamRecords = [];
  for (let i = 0; i < 5; i++) {
    const leader = volunteerRecords[i];
    const team = await prisma.team.create({
      data: {
        taskId: taskRecords[i].id,
        name: `Team ${['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'][i]}`,
        leaderId: leader.volunteer.id,
        maxSize: 5,
        currentSize: 1,
        isOpen: true,
      },
    });

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        volunteerId: leader.volunteer.id,
        role: 'LEADER',
      },
    });

    // Add 2 more members
    for (let j = 1; j <= 2; j++) {
      const memberIdx = i * 3 + j;
      if (memberIdx < volunteerRecords.length) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            volunteerId: volunteerRecords[memberIdx].volunteer.id,
            role: 'MEMBER',
          },
        });
        await prisma.team.update({
          where: { id: team.id },
          data: { currentSize: { increment: 1 } },
        });
      }
    }

    teamRecords.push(team);
  }
  console.log('  ✅ 5 teams created with members');

  // ── Chat Messages ──
  const chatMessages = [
    'Hey team, we need to regroup at the command center by 6 AM tomorrow.',
    'Supplies have arrived. 200 food packets and 50 medical kits ready.',
    'The road to sector 3 is flooded. We need boats.',
    'Great work today everyone! We helped 150 families.',
    'Can someone bring extra blankets? Temperature is dropping fast.',
    'Coordination call at 9 PM. Everyone please join.',
    'Local authorities have approved our entry pass for the restricted zone.',
    'We need 3 more volunteers for the night shift. Any takers?',
  ];

  for (let i = 0; i < 5; i++) {
    const team = teamRecords[i];
    for (let j = 0; j < 3; j++) {
      const memberIdx = i * 3 + (j % 3);
      if (memberIdx < volunteerRecords.length) {
        await prisma.chatMessage.create({
          data: {
            teamId: team.id,
            senderId: volunteerRecords[memberIdx].user.id,
            content: chatMessages[(i * 3 + j) % chatMessages.length],
            type: 'text',
          },
        });
      }
    }
  }
  console.log('  ✅ Chat messages created');

  // ── Donations ──
  const donationAmounts = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100, 7500, 15000];
  for (let i = 0; i < 10; i++) {
    const donorIdx = i % donorUsers.length;
    const ngoIdx = i % ngoRecords.length;
    await prisma.donation.create({
      data: {
        donorId: donorUsers[donorIdx].donor.id,
        ngoId: ngoRecords[ngoIdx].ngo.id,
        amount: donationAmounts[i],
        currency: 'INR',
        type: i % 3 === 0 ? 'MONTHLY' : 'ONE_TIME',
        status: 'COMPLETED',
        receiptNo: `NGONE-${2026}-${String(1000 + i).padStart(6, '0')}`,
        completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Update donor totals
  for (const du of donorUsers) {
    const total = await prisma.donation.aggregate({
      where: { donorId: du.donor.id, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });
    await prisma.donor.update({
      where: { id: du.donor.id },
      data: {
        totalDonated: total._sum.amount || 0,
        donationCount: total._count || 0,
      },
    });
  }
  console.log('  ✅ 10 donations created');

  // ── Resources ──
  const resourceData = [
    { ngoIdx: 0, name: 'Food Packets', category: 'food', quantity: 5000, unit: 'packets', allocated: 2000 },
    { ngoIdx: 0, name: 'Drinking Water', category: 'water', quantity: 10000, unit: 'liters', allocated: 4000 },
    { ngoIdx: 2, name: 'Medical Kits', category: 'medical', quantity: 500, unit: 'kits', allocated: 200 },
    { ngoIdx: 0, name: 'Emergency Tents', category: 'shelter', quantity: 200, unit: 'units', allocated: 80 },
    { ngoIdx: 2, name: 'First Aid Boxes', category: 'medical', quantity: 1000, unit: 'boxes', allocated: 350 },
    { ngoIdx: 3, name: 'Warm Blankets', category: 'shelter', quantity: 3000, unit: 'units', allocated: 1200 },
    { ngoIdx: 4, name: 'Water Purification Tablets', category: 'water', quantity: 20000, unit: 'tablets', allocated: 5000 },
    { ngoIdx: 1, name: 'School Supply Kits', category: 'equipment', quantity: 2000, unit: 'kits', allocated: 800 },
  ];

  for (const r of resourceData) {
    await prisma.resource.create({
      data: {
        ngoId: ngoRecords[r.ngoIdx].ngo.id,
        name: r.name,
        category: r.category,
        quantity: r.quantity,
        unit: r.unit,
        allocated: r.allocated,
        available: r.quantity - r.allocated,
      },
    });
  }
  console.log('  ✅ 8 resources created');

  // ── Programmes ──
  const programmeData = [
    { ngoIdx: 1, title: 'Digital Literacy Mission', slug: 'digital-literacy-mission', type: 'EDUCATION', description: 'Teaching computer skills to rural children across Maharashtra.', beneficiaries: 12000, targetAmount: 500000, raisedAmount: 380000 },
    { ngoIdx: 2, title: 'Mobile Health Clinics', slug: 'mobile-health-clinics', type: 'HEALTHCARE', description: 'Deploying mobile clinics to remote villages in Tamil Nadu.', beneficiaries: 25000, targetAmount: 1000000, raisedAmount: 720000 },
    { ngoIdx: 3, title: 'Women Skill Development', slug: 'women-skill-development', type: 'WOMEN_EMPOWERMENT', description: 'Skill training and micro-enterprise support for rural women in UP.', beneficiaries: 8000, targetAmount: 300000, raisedAmount: 250000 },
    { ngoIdx: 4, title: 'Organic Farming Training', slug: 'organic-farming-training', type: 'LIVELIHOOD', description: 'Training farmers in organic practices for sustainable agriculture.', beneficiaries: 5000, targetAmount: 200000, raisedAmount: 180000 },
    { ngoIdx: 0, title: 'Disaster Preparedness', slug: 'disaster-preparedness', type: 'DISASTER_RESPONSE', description: 'Community training for disaster awareness and emergency response.', beneficiaries: 50000, targetAmount: 750000, raisedAmount: 500000 },
  ];

  for (const p of programmeData) {
    await prisma.programme.create({
      data: {
        ngoId: ngoRecords[p.ngoIdx].ngo.id,
        title: p.title,
        slug: p.slug,
        type: p.type,
        description: p.description,
        beneficiaries: p.beneficiaries,
        targetAmount: p.targetAmount,
        raisedAmount: p.raisedAmount,
        state: ngoRecords[p.ngoIdx].ngo.state,
        isActive: true,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });
  }
  console.log('  ✅ 5 programmes created');

  // ── Notifications ──
  const notificationTypes = [
    { type: 'crisis_alert', title: '🆘 New Crisis Alert', body: 'Severe flooding reported in Assam. Volunteers needed urgently.' },
    { type: 'team_invite', title: '👥 Team Invitation', body: 'You\'ve been invited to join Team Alpha for Assam Floods relief.' },
    { type: 'donation', title: '💚 Donation Received', body: 'Thank you! Your donation of ₹5,000 has been received.' },
    { type: 'checkin', title: '✅ Check-in Confirmed', body: 'You\'ve checked in to Bihar Food Crisis task. +50 points!' },
    { type: 'system', title: '🎉 Level Up!', body: 'Congratulations! You\'ve reached HERO level.' },
  ];

  for (let i = 0; i < 15; i++) {
    const userIdx = i % volunteerRecords.length;
    const notifIdx = i % notificationTypes.length;
    await prisma.notification.create({
      data: {
        userId: volunteerRecords[userIdx].user.id,
        ...notificationTypes[notifIdx],
        isRead: i < 5,
        readAt: i < 5 ? new Date() : null,
      },
    });
  }
  console.log('  ✅ 15 notifications created');

  console.log('\n✅ Database seeded successfully!');
  console.log(`   Users: ${await prisma.user.count()}`);
  console.log(`   Volunteers: ${await prisma.volunteer.count()}`);
  console.log(`   NGOs: ${await prisma.nGO.count()}`);
  console.log(`   Crises: ${await prisma.crisis.count()}`);
  console.log(`   Teams: ${await prisma.team.count()}`);
  console.log(`   Donations: ${await prisma.donation.count()}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
