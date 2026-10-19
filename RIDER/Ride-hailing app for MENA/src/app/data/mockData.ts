export interface Place {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  coords: [number, number];
  type: 'landmark' | 'area' | 'mall' | 'hospital' | 'university' | 'airport';
}

export interface Driver {
  id: string;
  nameEn: string;
  nameAr: string;
  rating: number;
  vehicle_rating: number;
  totalTrips: number;
  carModel: string;
  carColor: string;
  licensePlate: string;
  phone: string;
  photo: string;
  // Algorithm-compatible fields (matches AlgoDriver in matching.ts)
  tiers: string[];
  lat: number;
  lng: number;
  available: boolean;
  status: 'idle' | 'returning' | 'on_trip' | 'offline';
  etaMinutes: number;
  offered: number;
  accepted: number;
  canceled: number;
  on_time_rate: number;
  trips_today: number;
  shift_hours: number;
  idle_min: number;
  consecutive_declines: number;
  vehicle_seats: number;
  assigned: number;
  speed_kmph_now: number;
  heading_deg: number;
}

export interface NewsArticle {
  id: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  category: string;
  categoryAr: string;
  timeAgo: number; // minutes
  readMinutes: number;
  image: string;
  featured?: boolean;
  url?: string;
  source?: string;
}

export type ExploreCategory = 'Cultural' | 'Food' | 'Entertainment' | 'Cafe' | 'Medical' | 'Shopping';

export interface ExploreDestination {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  image: string;
  tag: ExploreCategory;
  tagAr: string;
  coords: [number, number];
  rating: number;       // 1–5
  reviewCount: number;
  priceLevel?: 1 | 2 | 3 | 4; // $ $$ $$$ $$$$
  openNow?: boolean;
  address?: string;
}

// Ride products are rider-facing options (normal / comfort).
// Driver subscription tiers (economy/comfort/premium) are separate — see matching.ts.
export interface RideTier {
  id: 'normal' | 'comfort';
  label: string;
  labelAr: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  capacity: number;
  etaMin: number;
  etaMax: number;
}

export const AMMAN_CENTER: [number, number] = [31.9539, 35.9106];

export const AMMAN_PLACES: Place[] = [
  {
    id: 'downtown',
    nameEn: 'Downtown Amman',
    nameAr: 'وسط البلد',
    addressEn: 'Al-Hashimi St, Amman',
    addressAr: 'شارع الهاشمي، عمّان',
    coords: [31.9539, 35.9306],
    type: 'area',
  },
  {
    id: 'abdali',
    nameEn: 'Abdali Boulevard',
    nameAr: 'بوليفار العبدلي',
    addressEn: 'Abdali, Amman',
    addressAr: 'العبدلي، عمّان',
    coords: [31.9751, 35.9017],
    type: 'area',
  },
  {
    id: 'sweifiyyeh',
    nameEn: 'Sweifiyyeh',
    nameAr: 'الصويفية',
    addressEn: 'Al-Sweifiyyeh, Amman',
    addressAr: 'الصويفية، عمّان',
    coords: [31.9611, 35.8638],
    type: 'area',
  },
  {
    id: 'airport',
    nameEn: 'Queen Alia Airport',
    nameAr: 'مطار الملكة علياء',
    addressEn: 'QAIA, South Amman',
    addressAr: 'مطار الملكة علياء الدولي',
    coords: [31.7227, 35.9932],
    type: 'airport',
  },
  {
    id: 'roman_theater',
    nameEn: 'Roman Theater',
    nameAr: 'المدرج الروماني',
    addressEn: 'Downtown Amman',
    addressAr: 'وسط البلد، عمّان',
    coords: [31.9512, 35.9329],
    type: 'landmark',
  },
  {
    id: 'citadel',
    nameEn: 'Amman Citadel',
    nameAr: 'قلعة عمّان',
    addressEn: 'Jabal Al-Qalaa, Amman',
    addressAr: 'جبل القلعة، عمّان',
    coords: [31.9575, 35.9309],
    type: 'landmark',
  },
  {
    id: 'mecca_mall',
    nameEn: 'Mecca Mall',
    nameAr: 'مكة مول',
    addressEn: 'Airport Road, Amman',
    addressAr: 'طريق المطار، عمّان',
    coords: [31.9607, 35.8504],
    type: 'mall',
  },
  {
    id: 'jordan_university',
    nameEn: 'University of Jordan',
    nameAr: 'الجامعة الأردنية',
    addressEn: 'University St, Amman',
    addressAr: 'شارع الجامعة، عمّان',
    coords: [32.0154, 35.8715],
    type: 'university',
  },
  {
    id: 'rainbow_street',
    nameEn: 'Rainbow Street',
    nameAr: 'شارع الرينبو',
    addressEn: '1st Circle, Jabal Amman',
    addressAr: 'الدوار الأول، جبل عمّان',
    coords: [31.9568, 35.9148],
    type: 'area',
  },
  {
    id: 'king_hussein_park',
    nameEn: 'King Hussein Park',
    nameAr: 'حديقة الملك حسين',
    addressEn: 'Shmeisani, Amman',
    addressAr: 'الشميساني، عمّان',
    coords: [31.9820, 35.8930],
    type: 'landmark',
  },
];

export const DRIVERS: Driver[] = [
  {
    id: 'd1',
    nameEn: 'Ahmad Al-Rashid',
    nameAr: 'أحمد الراشد',
    rating: 4.8,
    vehicle_rating: 4.5,
    totalTrips: 1247,
    carModel: 'Toyota Camry 2022',
    carColor: 'White',
    licensePlate: '12-A-3456',
    phone: '+962791234567',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['economy'],
    lat: 31.963,
    lng: 35.918,
    available: true,
    status: 'idle',
    etaMinutes: 3,
    offered: 210,
    accepted: 189,
    canceled: 4,
    on_time_rate: 0.94,
    trips_today: 4,
    shift_hours: 4.5,
    idle_min: 18,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 3,
    speed_kmph_now: 0,
    heading_deg: 0,
  },
  {
    id: 'd2',
    nameEn: 'Mohammad Haddad',
    nameAr: 'محمد حداد',
    rating: 4.9,
    vehicle_rating: 4.7,
    totalTrips: 892,
    carModel: 'Honda Accord 2023',
    carColor: 'Silver',
    licensePlate: '78-B-1234',
    phone: '+962797654321',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['comfort'],
    lat: 31.958,
    lng: 35.905,
    available: true,
    status: 'idle',
    etaMinutes: 5,
    offered: 165,
    accepted: 155,
    canceled: 2,
    on_time_rate: 0.97,
    trips_today: 7,
    shift_hours: 6.0,
    idle_min: 5,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 5,
    speed_kmph_now: 0,
    heading_deg: 0,
  },
  {
    id: 'd3',
    nameEn: 'Khalid Al-Mansouri',
    nameAr: 'خالد المنصوري',
    rating: 5.0,
    vehicle_rating: 5.0,
    totalTrips: 2103,
    carModel: 'Mercedes E-Class 2024',
    carColor: 'Black',
    licensePlate: '55-C-7890',
    phone: '+962799876543',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['premium'],
    lat: 31.971,
    lng: 35.892,
    available: true,
    status: 'idle',
    etaMinutes: 7,
    offered: 320,
    accepted: 310,
    canceled: 3,
    on_time_rate: 0.99,
    trips_today: 9,
    shift_hours: 7.5,
    idle_min: 2,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 8,
    speed_kmph_now: 12,
    heading_deg: 45,
  },
];

// 2 rider-facing ride products — maps to algorithm's RideProduct type
export const RIDE_TIERS: RideTier[] = [
  {
    id: 'normal',
    label: 'Normal',
    labelAr: 'عادي',
    baseFare: 1.5,
    perKm: 0.35,
    perMin: 0.05,
    capacity: 4,
    etaMin: 2,
    etaMax: 5,
  },
  {
    id: 'comfort',
    label: 'Comfort',
    labelAr: 'مريح',
    baseFare: 2.0,
    perKm: 0.45,
    perMin: 0.07,
    capacity: 4,
    etaMin: 4,
    etaMax: 8,
  },
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'n1',
    titleEn: 'Wasel Launches in Amman — Drivers Keep 100% of Fares',
    titleAr: 'واصل تنطلق في عمّان — السائقون يحتفظون بـ 100% من الأجرة',
    summaryEn: 'The new ride-hailing platform flips the traditional model with a flat monthly subscription for drivers and zero per-ride commission, putting more money in drivers\' pockets.',
    summaryAr: 'تقلب منصة واصل النموذج التقليدي باشتراك شهري ثابت للسائقين وعدم أخذ أي عمولة عن كل رحلة، مما يضع المزيد من المال في جيوب السائقين.',
    category: 'Technology',
    categoryAr: 'تكنولوجيا',
    timeAgo: 15,
    readMinutes: 3,
    image: 'https://images.unsplash.com/photo-1715535017919-8e2c8e6fc1e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
    featured: true,
  },
  {
    id: 'n2',
    titleEn: 'Jordan\'s Transport Sector Embraces Digital Innovation',
    titleAr: 'قطاع النقل الأردني يتبنى الابتكار الرقمي',
    summaryEn: 'The Ministry of Transport announces new frameworks for ride-hailing apps operating in Jordan, ensuring fair competition and consumer protection.',
    summaryAr: 'تعلن وزارة النقل عن أطر جديدة لتطبيقات النقل العاملة في الأردن، لضمان المنافسة العادلة وحماية المستهلك.',
    category: 'Business',
    categoryAr: 'أعمال',
    timeAgo: 45,
    readMinutes: 4,
    image: 'https://images.unsplash.com/photo-1554234506-68015270578e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  },
  {
    id: 'n3',
    titleEn: 'Amman\'s Abdali Boulevard Completes Phase 3 Development',
    titleAr: 'بوليفار عبدلي يكمل المرحلة الثالثة من التطوير',
    summaryEn: 'The iconic urban development project in central Amman wraps up its third phase with new restaurants, retail outlets, and green spaces for residents.',
    summaryAr: 'يختتم مشروع التطوير الحضري الأيقوني في وسط عمّان مرحلته الثالثة بمطاعم ومحلات تجارية ومساحات خضراء جديدة للمقيمين.',
    category: 'City',
    categoryAr: 'المدينة',
    timeAgo: 120,
    readMinutes: 2,
    image: 'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  },
  {
    id: 'n4',
    titleEn: 'Rainbow Street Restaurants: A Culinary Revival in Jabal Amman',
    titleAr: 'مطاعم شارع الرينبو: نهضة طهو في جبل عمّان',
    summaryEn: 'The beloved cultural hub of Amman sees a wave of new openings, blending traditional Jordanian cuisine with modern dining concepts attracting locals and tourists alike.',
    summaryAr: 'يشهد المركز الثقافي الأثير في عمّان موجة من الافتتاحات الجديدة، مزجاً بين المطبخ الأردني التقليدي ومفاهيم الطعام الحديثة.',
    category: 'Lifestyle',
    categoryAr: 'أسلوب حياة',
    timeAgo: 200,
    readMinutes: 5,
    image: 'https://images.unsplash.com/photo-1709276351463-fc72a6d00b3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  },
  {
    id: 'n5',
    titleEn: 'Jordan Launches New Tourism Campaign Highlighting Petra and Wadi Rum',
    titleAr: 'الأردن يطلق حملة سياحية جديدة تُبرز البتراء ووادي رم',
    summaryEn: 'The Jordan Tourism Board unveils its latest international campaign targeting European and Gulf travelers, aiming to attract 10 million visitors by end of year.',
    summaryAr: 'تكشف هيئة تنشيط السياحة الأردنية عن أحدث حملة دولية تستهدف المسافرين الأوروبيين والخليجيين، بهدف استقطاب 10 ملايين زائر بحلول نهاية العام.',
    category: 'Tourism',
    categoryAr: 'سياحة',
    timeAgo: 360,
    readMinutes: 3,
    image: 'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  },
];

export const EXPLORE_DESTINATIONS: ExploreDestination[] = [
  // ── Cultural & Landmarks ─────────────────────────────────────────────────
  {
    id: 'roman_theater',
    nameEn: 'Roman Theater',
    nameAr: 'المدرج الروماني',
    descEn: 'A 6,000-seat, 2nd-century amphitheater carved into a hillside in downtown Amman. One of the best-preserved Roman theaters in the Middle East.',
    descAr: 'مدرج روماني يتسع لـ 6000 متفرج، محفور في التل في وسط البلد. من أجود المدرجات الرومانية حفظاً في الشرق الأوسط.',
    image: 'https://images.unsplash.com/photo-1715228892452-f6a2c4ff500d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cultural',
    tagAr: 'ثقافي',
    coords: [31.9512, 35.9329],
    rating: 4.7, reviewCount: 3241, openNow: true,
    address: 'Downtown Amman, Hashemi St',
  },
  {
    id: 'amman_citadel',
    nameEn: 'Amman Citadel',
    nameAr: 'قلعة عمّان',
    descEn: 'Perched atop Jebel al-Qal\'a, the citadel spans 7 millennia of history with ruins of Roman, Byzantine, and Umayyad structures. Panoramic views of the city.',
    descAr: 'تقع على قمة جبل القلعة وتمتد عبر 7 آلاف سنة من التاريخ بآثار رومانية وبيزنطية وأموية. إطلالات بانورامية على المدينة.',
    image: 'https://images.unsplash.com/photo-1630159196455-6db73aba8ed2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cultural',
    tagAr: 'ثقافي',
    coords: [31.9575, 35.9309],
    rating: 4.6, reviewCount: 5892, openNow: true,
    address: 'Jabal Al-Qalaa, Amman',
  },
  {
    id: 'jordan_museum',
    nameEn: 'Jordan Museum',
    nameAr: 'متحف الأردن',
    descEn: "Jordan's largest museum houses the Dead Sea Scrolls and artifacts spanning 100,000 years of human civilization. A must-visit for history lovers.",
    descAr: 'أكبر متاحف الأردن يحتضن مخطوطات البحر الميت وقطعاً أثرية تمتد 100,000 سنة من تاريخ البشرية.',
    image: 'https://images.unsplash.com/photo-1572953311013-626f0de68b0e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cultural',
    tagAr: 'ثقافي',
    coords: [31.9561, 35.9237],
    rating: 4.5, reviewCount: 2108, openNow: true,
    address: '3 Al-Hashimi St, Downtown',
  },
  {
    id: 'rainbow_street',
    nameEn: 'Rainbow Street',
    nameAr: 'شارع الرينبو',
    descEn: 'Amman\'s most vibrant cultural corridor. Lined with 1930s architecture, galleries, bookshops, street art, and the best coffee in the city.',
    descAr: 'أكثر الشوارع حيوية في عمّان. مليء بالمباني الثلاثينية والمعارض والمكتبات والفن والقهوة الأفضل في المدينة.',
    image: 'https://images.unsplash.com/photo-1709276351463-fc72a6d00b3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cultural',
    tagAr: 'ثقافي',
    coords: [31.9568, 35.9148],
    rating: 4.6, reviewCount: 4317, openNow: true,
    address: '1st Circle, Jabal Amman',
  },
  {
    id: 'petra',
    nameEn: 'Petra',
    nameAr: 'البتراء',
    descEn: 'The rose-red Nabataean city carved into cliff faces. A UNESCO World Heritage Site and one of the New Seven Wonders of the World.',
    descAr: 'المدينة النبطية الوردية المحفورة في الصخر. موقع اليونسكو وإحدى عجائب الدنيا السبع الجديدة.',
    image: 'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cultural',
    tagAr: 'ثقافي',
    coords: [30.3285, 35.4444],
    rating: 4.9, reviewCount: 28541, openNow: true,
    address: 'Wadi Musa, Ma\'an Governorate',
  },

  // ── Food ──────────────────────────────────────────────────────────────────
  {
    id: 'hashem',
    nameEn: 'Hashem Restaurant',
    nameAr: 'مطعم هاشم',
    descEn: 'A Amman institution since 1952. Famous for its foul, falafel, and hummus served to royalty and locals alike. Outdoor seating in downtown.',
    descAr: 'مؤسسة عمّانية منذ 1952. شهير بالفول والفلافل والحمص. يُقدَّم للملوك والمواطنين على حد سواء.',
    image: 'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Food',
    tagAr: 'طعام',
    coords: [31.9533, 35.9323],
    rating: 4.7, reviewCount: 6823, priceLevel: 1, openNow: true,
    address: 'Al-Amir Mohammad St, Downtown',
  },
  {
    id: 'tawaheen',
    nameEn: 'Tawaheen Al-Hawa',
    nameAr: 'طواحين الهواء',
    descEn: 'Iconic hilltop restaurant with sweeping views of Amman. Known for mezze, grilled meats, and live Arabic music on weekends.',
    descAr: 'مطعم أيقوني على التل بإطلالة بانورامية على عمّان. يشتهر بالمازة والمشاوي والموسيقى العربية في عطلات نهاية الأسبوع.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Food',
    tagAr: 'طعام',
    coords: [31.9698, 35.8791],
    rating: 4.4, reviewCount: 2341, priceLevel: 3, openNow: true,
    address: '7th Circle, Amman',
  },
  {
    id: 'sufra',
    nameEn: 'Sufra Restaurant',
    nameAr: 'مطعم سفرة',
    descEn: 'Authentic Jordanian home cooking in a restored 1940s house on Rainbow Street. The mansaf here is considered the best in the city.',
    descAr: 'طبخ أردني منزلي أصيل في منزل مرمم من الأربعينيات على شارع الرينبو. يُعتبر المنسف هنا الأفضل في المدينة.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Food',
    tagAr: 'طعام',
    coords: [31.9574, 35.9155],
    rating: 4.8, reviewCount: 3912, priceLevel: 2, openNow: true,
    address: 'Rainbow St, 1st Circle',
  },
  {
    id: 'cantaloupe',
    nameEn: 'Cantaloupe Gastro Pub',
    nameAr: 'كانتالوب',
    descEn: 'Rooftop restaurant with one of the best views in Amman. International menu with Mediterranean influences. Popular for sunset dinners.',
    descAr: 'مطعم على السطح بإطلالة من أجمل ما في عمّان. قائمة طعام دولية بتأثيرات متوسطية. شعبي لعشاء الغروب.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Food',
    tagAr: 'طعام',
    coords: [31.9583, 35.9205],
    rating: 4.3, reviewCount: 1876, priceLevel: 3, openNow: false,
    address: 'Jabal Amman, 1st Circle',
  },

  // ── Entertainment ─────────────────────────────────────────────────────────
  {
    id: 'grand_hussein',
    nameEn: 'Grand Hussein Park',
    nameAr: 'حديقة الملك حسين الكبرى',
    descEn: 'Amman\'s largest public park with a petting zoo, children\'s rides, open-air cinema, and weekend evening events. Free entry.',
    descAr: 'أكبر حديقة عامة في عمّان بحديقة حيوانات وألعاب أطفال وسينما مفتوحة وفعاليات مسائية. الدخول مجاني.',
    image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Entertainment',
    tagAr: 'ترفيه',
    coords: [31.9820, 35.8930],
    rating: 4.4, reviewCount: 4123, priceLevel: 1, openNow: true,
    address: 'Shmeisani, Amman',
  },
  {
    id: 'abdali_boulevard',
    nameEn: 'Abdali Boulevard',
    nameAr: 'بوليفار العبدلي',
    descEn: 'Amman\'s premier open-air entertainment and dining district. Fountains, art installations, 80+ restaurants, and a vibrant nightlife scene.',
    descAr: 'أبرز منطقة ترفيه ومطاعم مفتوحة في عمّان. نوافير ومنشآت فنية وأكثر من 80 مطعماً وحياة ليلية نابضة.',
    image: 'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Entertainment',
    tagAr: 'ترفيه',
    coords: [31.9751, 35.9017],
    rating: 4.5, reviewCount: 7841, priceLevel: 2, openNow: true,
    address: 'Abdali District, Amman',
  },
  {
    id: 'mecca_mall',
    nameEn: 'Mecca Mall',
    nameAr: 'مكة مول',
    descEn: 'One of Amman\'s largest malls with 350+ stores, a cinema, indoor theme park, and international dining. A full day out for the family.',
    descAr: 'أحد أكبر مراكز التسوق في عمّان بأكثر من 350 متجر وسينما وحديقة ترفيه داخلية ومطاعم دولية.',
    image: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Entertainment',
    tagAr: 'ترفيه',
    coords: [31.9607, 35.8504],
    rating: 4.3, reviewCount: 12543, priceLevel: 2, openNow: true,
    address: 'Airport Road, Amman',
  },
  {
    id: 'dead_sea',
    nameEn: 'Dead Sea',
    nameAr: 'البحر الميت',
    descEn: 'Float effortlessly in the hyper-saline waters at 430m below sea level. Mineral-rich mud is famous for its therapeutic properties.',
    descAr: 'اطفو بلا جهد في المياه فائقة الملوحة على عمق 430م تحت سطح البحر. طين غني بالمعادن مشهور بخصائصه العلاجية.',
    image: 'https://images.unsplash.com/photo-1568721969998-87aba181683a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Entertainment',
    tagAr: 'ترفيه',
    coords: [31.5590, 35.4732],
    rating: 4.6, reviewCount: 9234, priceLevel: 3, openNow: true,
    address: 'Dead Sea Road, Ghor Al-Safi',
  },

  // ── Cafes ──────────────────────────────────────────────────────────────────
  {
    id: 'cafe_de_paris',
    nameEn: 'Café de Paris',
    nameAr: 'كافيه دي باريس',
    descEn: 'Iconic corner café at 1st Circle since 1955. Strong Arabic coffee, fresh pastries, and a terrace perfect for people-watching.',
    descAr: 'مقهى ركني أيقوني عند الدوار الأول منذ 1955. قهوة عربية قوية وحلويات طازجة وتراس مثالي لمراقبة الناس.',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cafe',
    tagAr: 'مقهى',
    coords: [31.9566, 35.9162],
    rating: 4.4, reviewCount: 2130, priceLevel: 2, openNow: true,
    address: '1st Circle, Jabal Amman',
  },
  {
    id: 'books_rooftop',
    nameEn: 'Books@Cafe',
    nameAr: 'بوكس كافيه',
    descEn: 'Amman\'s first true specialty coffee spot with a bookshop, rooftop terrace, and LGBT-friendly atmosphere. A cultural landmark.',
    descAr: 'أول مقهى متخصص في عمّان مع مكتبة وتراس علوي وأجواء ثقافية مفتوحة. معلم ثقافي حقيقي.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cafe',
    tagAr: 'مقهى',
    coords: [31.9581, 35.9167],
    rating: 4.6, reviewCount: 3421, priceLevel: 2, openNow: true,
    address: 'Omar bin Al-Khattab St, 1st Circle',
  },
  {
    id: 'rumi',
    nameEn: 'Rumi Cafe',
    nameAr: 'كافيه رومي',
    descEn: 'Cozy artisan cafe in Weibdeh serving single-origin pour-overs, homemade cakes, and weekly poetry nights.',
    descAr: 'مقهى مريح في الويبدة يقدم قهوة مختصة أحادية المصدر وحلويات منزلية وأمسيات شعرية أسبوعية.',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cafe',
    tagAr: 'مقهى',
    coords: [31.9631, 35.9224],
    rating: 4.7, reviewCount: 987, priceLevel: 2, openNow: true,
    address: 'Al-Wihdeh, Amman',
  },
  {
    id: 'wild_jordan',
    nameEn: 'Wild Jordan Center',
    nameAr: 'مركز الأردن البري',
    descEn: 'Organic café with a spectacular view over Amman. Run by the Royal Society for Nature Conservation — supports Jordan\'s protected areas.',
    descAr: 'مقهى عضوي بإطلالة رائعة على عمّان. تديره الجمعية الملكية لصون الطبيعة — يدعم المناطق المحمية في الأردن.',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Cafe',
    tagAr: 'مقهى',
    coords: [31.9563, 35.9208],
    rating: 4.5, reviewCount: 1654, priceLevel: 2, openNow: true,
    address: 'Othman Bin Affan St, Jabal Amman',
  },

  // ── Medical ────────────────────────────────────────────────────────────────
  {
    id: 'jordan_hospital',
    nameEn: 'Jordan Hospital',
    nameAr: 'المستشفى الأردني',
    descEn: 'The largest private hospital in Jordan. World-class specialists in cardiology, oncology, and orthopedics with 24/7 emergency services.',
    descAr: 'أكبر مستشفى خاص في الأردن. متخصصون على مستوى عالمي في القلب والأورام والعظام مع خدمات طوارئ على مدار الساعة.',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Medical',
    tagAr: 'طبي',
    coords: [31.9677, 35.8778],
    rating: 4.4, reviewCount: 3891, openNow: true,
    address: 'Queen Noor St, 6th Circle',
  },
  {
    id: 'khalidi_hospital',
    nameEn: 'Al-Khalidi Medical Center',
    nameAr: 'مركز الخالدي الطبي',
    descEn: 'Established 1951. Comprehensive hospital with specialized clinics, imaging center, and international patient services in central Amman.',
    descAr: 'تأسس عام 1951. مستشفى شامل بعيادات متخصصة ومركز تصوير وخدمات للمرضى الدوليين في وسط عمّان.',
    image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Medical',
    tagAr: 'طبي',
    coords: [31.9617, 35.9098],
    rating: 4.3, reviewCount: 2134, openNow: true,
    address: 'Ibn Khaldoon St, 3rd Circle',
  },
  {
    id: 'specialty_hospital',
    nameEn: 'Specialty Hospital',
    nameAr: 'مستشفى التخصصي',
    descEn: 'ISO-certified hospital known for cardiac surgery, neurology, and cancer center. Has received medical tourism awards for service excellence.',
    descAr: 'مستشفى معتمد بشهادة ISO مشهور بجراحة القلب وعلم الأعصاب ومركز السرطان. حائز على جوائز السياحة العلاجية.',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Medical',
    tagAr: 'طبي',
    coords: [31.9734, 35.8742],
    rating: 4.6, reviewCount: 4231, openNow: true,
    address: '7th Circle, Amman',
  },

  // ── Shopping ───────────────────────────────────────────────────────────────
  {
    id: 'city_mall',
    nameEn: 'City Mall',
    nameAr: 'سيتي مول',
    descEn: 'Premium mall in Dabouq with luxury brands, ZARA, M&S, Carrefour, and an IMAX cinema. Jordan\'s favorite weekend destination.',
    descAr: 'مول فاخر في الضبوق بعلامات تجارية راقية وزارا وماركس وكارفور وسينما IMAX. وجهة عطلة نهاية الأسبوع المفضلة.',
    image: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Shopping',
    tagAr: 'تسوق',
    coords: [31.9998, 35.8456],
    rating: 4.5, reviewCount: 18234, priceLevel: 3, openNow: true,
    address: 'Dabouq, Amman',
  },
  {
    id: 'souk_jara',
    nameEn: 'Souk Jara',
    nameAr: 'سوق جارا',
    descEn: 'Amman\'s beloved open-air artisan market on Rainbow Street every Friday morning. Handcrafts, local produce, vintage, and live music.',
    descAr: 'سوق الحرفيين الشعبي المفضل في عمّان على شارع الرينبو كل جمعة صباحاً. حرف يدوية ومنتجات محلية وموسيقى حية.',
    image: 'https://images.unsplash.com/photo-1481401501924-da74b634fc02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    tag: 'Shopping',
    tagAr: 'تسوق',
    coords: [31.9570, 35.9142],
    rating: 4.7, reviewCount: 5234, priceLevel: 1, openNow: false,
    address: 'Rainbow St (Fridays only)',
  },
];

export function calculateFare(tier: RideTier, distanceKm: number, durationMin: number): number {
  return tier.baseFare + (tier.perKm * distanceKm) + (tier.perMin * durationMin);
}

export function formatFare(fare: number): string {
  return fare.toFixed(2);
}
