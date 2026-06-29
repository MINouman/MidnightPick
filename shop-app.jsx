// midnight pick -  shop page
const { useState, useEffect, useRef } = React;

// Resize-aware mobile check — 640px matches the CSS breakpoint used across
// the shop page (inline controls, buy sheet, sticky CTA).
function useIsMobile(bp = 640) {
  const [mobile, setMobile] = useState(() => window.matchMedia(`(max-width: ${bp}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const onChange = e => setMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [bp]);
  return mobile;
}

const PRODUCT_DEFAULT = {
  id: null,
  category: "",
  name: "",
  status: "active",
  inStock: true,
  badge: "",
  price: 0,
  originalPrice: 0,
  salePrice: 0,
  discountAmount: 0,
  discountMaxQty: null,
  discountLabel: "",
  desc: "",
  roast: "",
  origin: "",
  blend: "",
  process: "",
  weight: "",
  images: [],
};

function getMidnightApiBase() {
  if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, "");

  const { protocol, hostname, port } = window.location;
  const base = (!port || port === "80" || port === "443")
    ? `${protocol}//${hostname}/api/v1`
    : `${protocol}//${hostname}:3000/api/v1`;
  window.MIDNIGHT_API_BASE = base;
  return base;
}

const API_BASE = getMidnightApiBase();
const THUMB_LABELS = ["Front", "Back"];
const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;
const BKASH_TXN_ID_PATTERN = /^[A-Z0-9]{10}$/;
const BKASH_TXN_ID_PATTERN_MESSAGE = "bKash transaction ID must be exactly 10 letters or numbers.";
const BKASH_MERCHANT_NUMBER = "01XXXXXXXXX";
const BKASH_QR_IMAGE_PATH   = "/bkash-qr.png";

// TASK 2 — OrderModal mobile sheet
let mpSheetStyleInjected = false;
function injectMpSheetStyle() {
  if (mpSheetStyleInjected) return;
  const s = document.createElement("style");
  s.textContent = `
@keyframes mpSheetSlideUp {
  from {
    transform: translateY(100%);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}`;
  document.head.appendChild(s);
  mpSheetStyleInjected = true;
}

function calculateProductPricing(product, qty) {
  const originalPrice = Math.round(Number(product.originalPrice || product.price || 0));
  const salePrice = Math.round(Number(product.salePrice || product.price || 0));
  const discountPerUnit = Math.max(0, originalPrice - salePrice);
  const discountedQty = discountPerUnit > 0
    ? (product.discountMaxQty ? Math.min(qty, Number(product.discountMaxQty)) : qty)
    : 0;
  const originalSubtotal = originalPrice * qty;
  const productDiscountTotal = discountPerUnit * discountedQty;
  return {
    originalPrice,
    salePrice,
    originalSubtotal,
    productSubtotal: originalSubtotal - productDiscountTotal,
    productDiscountTotal,
    discountedQty,
  };
}

const DELIVERY_DHAKA_THANAS = new Set([
  "adabor", "badda", "banani", "bangshal", "bhashantek", "bimanbandar", "cantonment",
  "chalkbazar", "chawkbazar", "dakshinkhan", "dakshin khan", "darus-salam", "darus salam",
  "demra", "dhanmondi", "gandaria", "gulshan", "hazaribag", "hazaribagh", "jatrabari",
  "kafrul", "kalabagan", "kamrangirchar", "kadamtoli", "kadamtali", "khilgaon",
  "khilkhet", "kotwali", "lalbagh", "mirpur", "mirpur model", "mohammadpur",
  "motijheel", "mugda", "new market", "pallabi", "paltan", "ramna", "rampura",
  "rupnagar", "sabujbag", "sabujbagh", "shah ali", "shahbagh", "shahjahanpur",
  "sher-e-bangla nagar", "shyampur", "sutrapur", "tejgaon", "tejgaon industrial area",
  "turag", "uttara east", "uttara west", "uttarkhan", "uttar khan", "vatara", "wari",
  "dhaka",
]);

const DELIVERY_SUBURBAN_AREAS = new Set([
  "savar", "ashulia", "keraniganj", "narayanganj", "narayanganj sadar", "fatullah",
  "siddhirganj", "rupganj", "sonargaon", "gazipur", "gazipur sadar", "tongi",
  "kaliakair", "kaliganj", "kapasia", "sreepur", "dhamrai", "dohar", "nawabganj",
]);

function parseWeightGrams(weight) {
  const match = String(weight || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Math.max(1, Math.round(Number(match[1]))) : 95;
}

function normalizeDeliveryLocation(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function collectDeliveryLocationParts(location) {
  if (Array.isArray(location)) return location.map(normalizeDeliveryLocation).filter(Boolean);
  if (location && typeof location === "object") {
    return [location.area, location.district, location.city, location.location].map(normalizeDeliveryLocation).filter(Boolean);
  }
  return [normalizeDeliveryLocation(location)].filter(Boolean);
}

function matchesDeliveryArea(parts, areas) {
  return parts.some(part => {
    if (areas.has(part)) return true;
    for (const area of areas) {
      if (part.startsWith(`${area} `) || part.endsWith(` ${area}`)) return true;
    }
    return false;
  });
}

function calculateShippingCost(location, weightGrams) {
  const parts = collectDeliveryLocationParts(location);
  const suburban = matchesDeliveryArea(parts, DELIVERY_SUBURBAN_AREAS);
  const insideDhaka = !suburban && parts.some(part => DELIVERY_DHAKA_THANAS.has(part) || part === "dhaka" || part === "dhaka city");

  if (insideDhaka) {
    if (weightGrams <= 150) return 55;
    if (weightGrams <= 500) return 65;
    if (weightGrams <= 1000) return 75;
    return 75 + Math.ceil((weightGrams - 1000) / 1000) * 20;
  }

  if (suburban) {
    if (weightGrams <= 1000) return 105;
    return 105 + Math.ceil((weightGrams - 1000) / 1000) * 20;
  }

  if (weightGrams <= 500) return 115;
  if (weightGrams <= 1000) return 135;
  return 135 + Math.ceil((weightGrams - 1000) / 1000) * 20;
}

function calculateCheckoutCharges(product, qty, location, productPayable) {
  const locationParts = collectDeliveryLocationParts(location);
  if (!locationParts.length) return { shippingCost: 0, codFee: 0, totalDeliveryCharge: 0, finalTotal: productPayable };
  const weightGrams = parseWeightGrams(product?.weight) * qty;
  const shippingCost = calculateShippingCost(location, weightGrams);
  const codFee = Math.round(Math.max(0, Number(productPayable || 0)) * 0.01);
  const totalDeliveryCharge = shippingCost + codFee;
  return {
    shippingCost,
    codFee,
    totalDeliveryCharge,
    finalTotal: productPayable + totalDeliveryCharge,
  };
}

function getDiscountCapMessage(product, qty) {
  const cap = Number(product?.discountMaxQty || 0);
  const orderCap = Number(product?.discountMaxOrders || 0);
  const messages = [];

  if (product?.discountBlocked) {
    messages.push("This offer is no longer available for this phone number. Regular price applies.");
    return messages.join(" ");
  }

  if (cap) {
    const unit = cap === 1 ? "unit" : "units";
    messages.push(
      qty > cap
        ? `Only the first ${cap} ${unit} get the offer. Extra quantity is full price.`
        : `Offer applies to first ${cap} ${unit} per order.`
    );
  }

  if (orderCap) {
    const orderWord = orderCap === 1 ? "order" : "orders";
    messages.push(`Offer applies to first ${orderCap} ${orderWord} per phone number.`);
  }

  return messages.join(" ");
}

function OfferExpiredAlert({ productName, price, isOfferExpired, currencySymbol = "৳", animationKey = "" }) {
  const alertRef = useRef(null);
  const formattedPrice = `${currencySymbol}${Number(price || 0).toLocaleString()}`;

  useEffect(() => {
    if (!isOfferExpired || !alertRef.current) return;
    const el = alertRef.current;
    el.classList.remove("shake-active");
    // Force a reflow so re-adding the class restarts the CSS animation
    // when the modal opens again without a full component unmount.
    void el.offsetWidth;
    el.classList.add("shake-active");
  }, [isOfferExpired, animationKey, productName, price]);

  if (!isOfferExpired) {
    return (
      <div className="offer-expired-plain-row">
        <span className="offer-expired-product-name">{productName}</span>
        <span className="offer-expired-price">{formattedPrice}</span>
      </div>
    );
  }

  return (
    <div ref={alertRef} className="offer-expired-wrapper">
      <div className="offer-expired-product-row">
        <span className="offer-expired-product-name">{productName}</span>
        <span className="offer-expired-price">{formattedPrice}</span>
      </div>
      <div className="offer-expired-banner" role="alert" aria-live="assertive">
        <span className="offer-expired-icon" aria-hidden="true">
          <svg className="offer-expired-icon-svg" viewBox="0 0 24 24" focusable="false">
            <path d="M12 3.75 2.85 19.5h18.3L12 3.75Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 8.25v5.25M12 17.25h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="offer-expired-message">
          This offer is no longer available for this phone number. Regular price applies.
        </span>
      </div>
    </div>
  );
}

function hasProductDiscount(product) {
  return Number(product?.discountAmount || 0) > 0 ||
    Number(product?.originalPrice || 0) > Number(product?.salePrice || product?.price || 0);
}

function checkoutApiErrorMessage(error, fallback) {
  if (error?.retry_after_seconds) {
    const minutes = Math.max(1, Math.ceil(error.retry_after_seconds / 60));
    return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return error?.message || fallback;
}

function normalizeBdMobile(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^008801[3-9]\d{8}$/.test(digits)) return digits.slice(4);
  if (/^8801[3-9]\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}

function isValidBdMobile(raw) {
  return BD_MOBILE_PATTERN.test(normalizeBdMobile(raw));
}

// ── Bangladesh city → area map ────────────────────────────────────────────────
const BD_AREAS = {
  "Dhaka City": [
    "Adabor","Airport","Badda","Banani","Bangshal","Bhashantek","Cantonment",
    "Chawkbazar","Dakshin Khan","Darus Salam","Demra","Dhanmondi","Gandaria",
    "Gulshan","Hatirjheel","Hazaribagh","Jatrabari","Kadamtali","Kafrul",
    "Kalabagan","Kamrangirchar","Khilgaon","Khilkhet","Kotwali","Lalbagh",
    "Mirpur Model","Mohammadpur","Motijheel","Mugda","New Market","Pallabi",
    "Paltan","Ramna","Rampura","Rupnagar","Sabujbagh","Shah Ali","Shahbagh",
    "Shahjahanpur","Sher-e-Bangla Nagar","Shyampur","Sutrapur","Tejgaon",
    "Tejgaon Industrial Area","Turag","Uttar Khan","Uttara East","Uttara West",
    "Vatara","Wari"
  ],

  "Dhaka": [
    "Dhamrai","Dohar","Keraniganj","Nawabganj","Savar"
  ],

  "Chattogram City": [
    "Akbar Shah","Bayazid Bostami","Bakalia","Bandar","Chandgaon","Chawkbazar",
    "Double Mooring","EPZ","Halishahar","Karnaphuli","Kotwali","Khulshi",
    "Pahartali","Panchlaish","Patenga","Sadarghat"
  ],

  "Chattogram": [
    "Anwara","Banshkhali","Boalkhali","Chandanaish","Fatikchhari","Hathazari",
    "Lohagara","Mirsharai","Patiya","Rangunia","Raozan","Sandwip","Satkania",
    "Sitakunda","Karnaphuli"
  ],

  "Bagerhat": [
    "Bagerhat Sadar","Chitalmari","Fakirhat","Kachua","Mollahat","Mongla",
    "Morrelganj","Rampal","Sarankhola"
  ],

  "Bandarban": [
    "Alikadam","Bandarban Sadar","Lama","Naikhongchhari","Rowangchhari",
    "Ruma","Thanchi"
  ],

  "Barguna": [
    "Amtali","Bamna","Barguna Sadar","Betagi","Patharghata","Taltali"
  ],

  "Barishal": [
    "Agailjhara","Babuganj","Bakerganj","Banaripara","Barishal Sadar",
    "Gaurnadi","Hizla","Mehendiganj","Muladi","Wazirpur"
  ],

  "Bhola": [
    "Bhola Sadar","Borhanuddin","Char Fasson","Daulatkhan","Lalmohan",
    "Manpura","Tazumuddin"
  ],

  "Bogura": [
    "Adamdighi","Bogura Sadar","Dhunat","Dupchanchia","Gabtali","Kahaloo",
    "Nandigram","Sariakandi","Shahjahanpur","Sherpur","Shibganj","Sonatala"
  ],

  "Brahmanbaria": [
    "Akhaura","Ashuganj","Bancharampur","Bijoynagar","Brahmanbaria Sadar",
    "Kasba","Nabinagar","Nasirnagar","Sarail"
  ],

  "Chandpur": [
    "Chandpur Sadar","Faridganj","Haimchar","Hajiganj","Kachua",
    "Matlab Dakshin","Matlab Uttar","Shahrasti"
  ],

  "Chapainawabganj": [
    "Bholahat","Chapainawabganj Sadar","Gomastapur","Nachole","Shibganj"
  ],

  "Chuadanga": [
    "Alamdanga","Chuadanga Sadar","Damurhuda","Jibannagar"
  ],

  "Cox's Bazar": [
    "Chakaria","Cox's Bazar Sadar","Eidgaon","Kutubdia","Maheshkhali",
    "Pekua","Ramu","Teknaf","Ukhiya"
  ],

  "Cumilla": [
    "Barura","Brahmanpara","Burichang","Chandina","Chauddagram",
    "Cumilla Adarsha Sadar","Cumilla Sadar Dakshin","Daudkandi","Debidwar",
    "Homna","Laksam","Lalmai","Meghna","Monoharganj","Muradnagar",
    "Nangalkot","Titas"
  ],

  "Dinajpur": [
    "Birampur","Birganj","Birol","Bochaganj","Chirirbandar","Dinajpur Sadar",
    "Fulbari","Ghoraghat","Hakimpur","Kaharole","Khansama","Nawabganj",
    "Parbatipur"
  ],

  "Faridpur": [
    "Alfadanga","Bhanga","Boalmari","Charbhadrasan","Faridpur Sadar",
    "Madhukhali","Nagarkanda","Sadarpur","Saltha"
  ],

  "Feni": [
    "Chhagalnaiya","Daganbhuiyan","Feni Sadar","Fulgazi","Parshuram","Sonagazi"
  ],

  "Gaibandha": [
    "Fulchhari","Gaibandha Sadar","Gobindaganj","Palashbari","Sadullapur",
    "Saghata","Sundarganj"
  ],

  "Gazipur": [
    "Gazipur Sadar","Kaliakair","Kaliganj","Kapasia","Sreepur",
    "Bason","Gacha","Kashimpur","Konabari","Pubail","Tongi East","Tongi West"
  ],

  "Gopalganj": [
    "Gopalganj Sadar","Kashiani","Kotalipara","Muksudpur","Tungipara"
  ],

  "Habiganj": [
    "Ajmiriganj","Bahubal","Baniachong","Chunarughat","Habiganj Sadar",
    "Lakhai","Madhabpur","Nabiganj","Shayestaganj"
  ],

  "Jamalpur": [
    "Bakshiganj","Dewanganj","Islampur","Jamalpur Sadar","Madarganj",
    "Melandaha","Sarishabari"
  ],

  "Jashore": [
    "Abhaynagar","Bagherpara","Chaugachha","Jashore Sadar","Jhikargachha",
    "Keshabpur","Manirampur","Sharsha"
  ],

  "Jhalakathi": [
    "Jhalakathi Sadar","Kathalia","Nalchity","Rajapur"
  ],

  "Jhenaidah": [
    "Harinakundu","Jhenaidah Sadar","Kaliganj","Kotchandpur","Maheshpur",
    "Shailkupa"
  ],

  "Joypurhat": [
    "Akkelpur","Joypurhat Sadar","Kalai","Khetlal","Panchbibi"
  ],

  "Khagrachhari": [
    "Dighinala","Guimara","Khagrachhari Sadar","Lakshmichhari","Mahalchhari",
    "Manikchhari","Matiranga","Panchhari","Ramgarh"
  ],

  "Khulna": [
    "Batiaghata","Dacope","Dighalia","Dumuria","Koyra","Paikgacha",
    "Phultala","Rupsa","Terokhada","Khulna Sadar","Sonadanga",
    "Khalishpur","Daulatpur","Khan Jahan Ali","Lobonchara"
  ],

  "Kishoreganj": [
    "Austagram","Bajitpur","Bhairab","Hossainpur","Itna","Karimganj",
    "Katiadi","Kishoreganj Sadar","Kuliarchar","Mithamain","Nikli",
    "Pakundia","Tarail"
  ],

  "Kurigram": [
    "Bhurungamari","Char Rajibpur","Chilmari","Fulbari","Kurigram Sadar",
    "Nageshwari","Rajarhat","Roumari","Ulipur"
  ],

  "Kushtia": [
    "Bheramara","Daulatpur","Khoksa","Kumarkhali","Kushtia Sadar","Mirpur"
  ],

  "Lakshmipur": [
    "Kamalnagar","Lakshmipur Sadar","Raipur","Ramganj","Ramgati"
  ],

  "Lalmonirhat": [
    "Aditmari","Hatibandha","Kaliganj","Lalmonirhat Sadar","Patgram"
  ],

  "Madaripur": [
    "Dasar","Kalkini","Madaripur Sadar","Rajoir","Shibchar"
  ],

  "Magura": [
    "Magura Sadar","Mohammadpur","Shalikha","Sreepur"
  ],

  "Manikganj": [
    "Daulatpur","Ghior","Harirampur","Manikganj Sadar","Saturia",
    "Shibalaya","Singair"
  ],

  "Meherpur": [
    "Gangni","Meherpur Sadar","Mujibnagar"
  ],

  "Moulvibazar": [
    "Barlekha","Juri","Kamalganj","Kulaura","Moulvibazar Sadar",
    "Rajnagar","Sreemangal"
  ],

  "Munshiganj": [
    "Gazaria","Louhajang","Munshiganj Sadar","Sirajdikhan","Sreenagar","Tongibari"
  ],

  "Mymensingh": [
    "Bhaluka","Dhobaura","Fulbaria","Gafargaon","Gouripur","Haluaghat",
    "Ishwarganj","Mymensingh Sadar","Muktagacha","Nandail","Phulpur",
    "Tarakanda","Trishal"
  ],

  "Naogaon": [
    "Atrai","Badalgachhi","Dhamoirhat","Manda","Mahadebpur","Naogaon Sadar",
    "Niamatpur","Patnitala","Porsha","Raninagar","Sapahar"
  ],

  "Narail": [
    "Kalia","Lohagara","Narail Sadar"
  ],

  "Narayanganj": [
    "Araihazar","Bandar","Fatullah","Narayanganj Sadar","Rupganj",
    "Siddhirganj","Sonargaon"
  ],

  "Narsingdi": [
    "Belabo","Monohardi","Narsingdi Sadar","Palash","Raipura","Shibpur"
  ],

  "Natore": [
    "Bagatipara","Baraigram","Gurudaspur","Lalpur","Naldanga",
    "Natore Sadar","Singra"
  ],

  "Netrokona": [
    "Atpara","Barhatta","Durgapur","Khaliajuri","Kalmakanda","Kendua",
    "Madan","Mohanganj","Netrokona Sadar","Purbadhala"
  ],

  "Nilphamari": [
    "Dimla","Domar","Jaldhaka","Kishoreganj","Nilphamari Sadar","Saidpur"
  ],

  "Noakhali": [
    "Begumganj","Chatkhil","Companiganj","Hatiya","Kabirhat","Noakhali Sadar",
    "Senbagh","Sonaimuri","Subarnachar"
  ],

  "Pabna": [
    "Atgharia","Bera","Bhangura","Chatmohar","Faridpur","Ishwardi",
    "Pabna Sadar","Santhia","Sujanagar"
  ],

  "Panchagarh": [
    "Atwari","Boda","Debiganj","Panchagarh Sadar","Tetulia"
  ],

  "Patuakhali": [
    "Bauphal","Dashmina","Dumki","Galachipa","Kalapara","Mirzaganj",
    "Patuakhali Sadar","Rangabali"
  ],

  "Pirojpur": [
    "Bhandaria","Kawkhali","Mathbaria","Nazirpur","Nesarabad",
    "Pirojpur Sadar","Zianagar"
  ],

  "Rajbari": [
    "Baliakandi","Goalanda","Kalukhali","Pangsha","Rajbari Sadar"
  ],

  "Rajshahi": [
    "Bagha","Bagmara","Charghat","Durgapur","Godagari","Mohanpur",
    "Paba","Puthia","Tanore","Boalia","Motihar","Rajpara","Shah Makhdum"
  ],

  "Rangamati": [
    "Baghaichhari","Barkal","Belaichhari","Juraichhari","Kaptai","Kawkhali",
    "Langadu","Naniarchar","Rajasthali","Rangamati Sadar"
  ],

  "Rangpur": [
    "Badarganj","Gangachara","Kaunia","Mithapukur","Pirgachha","Pirganj",
    "Rangpur Sadar","Taraganj"
  ],

  "Satkhira": [
    "Assasuni","Debhata","Kalaroa","Kaliganj","Satkhira Sadar",
    "Shyamnagar","Tala"
  ],

  "Shariatpur": [
    "Bhedarganj","Damudya","Gosairhat","Naria","Shariatpur Sadar","Zajira"
  ],

  "Sherpur": [
    "Jhenaigati","Nakla","Nalitabari","Sherpur Sadar","Sreebardi"
  ],

  "Sirajganj": [
    "Belkuchi","Chauhali","Kamarkhand","Kazipur","Raiganj","Shahjadpur",
    "Sirajganj Sadar","Tarash","Ullapara"
  ],

  "Sunamganj": [
    "Bishwamvarpur","Chhatak","Derai","Dharmapasha","Dowarabazar",
    "Jagannathpur","Jamalganj","Madhyanagar","Shalla","Shantiganj",
    "Sunamganj Sadar","Tahirpur"
  ],

  "Sylhet": [
    "Balaganj","Beanibazar","Bishwanath","Companiganj","Dakshin Surma",
    "Fenchuganj","Golapganj","Gowainghat","Jaintiapur","Kanaighat",
    "Osmani Nagar","Sylhet Sadar","Zakiganj","Kotwali","Jalalabad",
    "Airport","Moglabazar","Shah Poran"
  ],

  "Tangail": [
    "Basail","Bhuapur","Delduar","Dhanbari","Ghatail","Gopalpur",
    "Kalihati","Madhupur","Mirzapur","Nagarpur","Sakhipur","Tangail Sadar"
  ],

  "Thakurgaon": [
    "Baliadangi","Haripur","Pirganj","Ranisankail","Thakurgaon Sadar"
  ]
};

// ── minimal header ────────────────────────────────────────────────────────────
const ROLE_DASH = { user: "dashboard-user.html", crew: "dashboard-user.html", influencer: "dashboard-influencer.html", admin: "dashboard-admin.html" };

function getShopAuthState() {
  try {
    // Token is now in httpOnly cookie, cannot check from JavaScript
    // Use user info from localStorage to determine login state
    const u = JSON.parse(localStorage.getItem("mp_user") || "{}");
    return { loggedIn: !!u?.id, dashUrl: ROLE_DASH[u.role] || "dashboard-user.html", user: u };
  } catch { return { loggedIn: false, dashUrl: "dashboard-user.html", user: null }; }
}

function ShopHeader({ onSignIn, productName, loggedIn, dashUrl, onLogout }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <SiteBannerManager floating />
      <header className="shop-header">
        <a href="index.html" className="shop-header-back" aria-label="Back to home">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          <span>Home</span>
          {productName && (
            <>
              <span className="shop-breadcrumb-sep">/</span>
              <span className="shop-breadcrumb-current">{productName}</span>
            </>
          )}
        </a>
        <div className="shop-header-actions">
          {loggedIn ? (
            <>
              <a href={dashUrl} className="nav-signin-btn">
                <i className="fa-solid fa-gauge" aria-hidden="true" />
                Dashboard
              </a>
              <button className="nav-signin-btn" onClick={onLogout}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
                Log Out
              </button>
            </>
          ) : (
            <button className="nav-signin-btn" onClick={onSignIn}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
}

function ShopStarRating({ rating, reviews }) {
  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <button
      className="shop-rating"
      onClick={scrollToReviews}
      aria-label="Read customer reviews"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
    >
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} filled={i <= Math.round(rating)} />
      ))}
      <span className="shop-rating-num">{rating}</span>
      <span className="shop-rating-reviews" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>({reviews} reviews)</span>
    </button>
  );
}

function ShopToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div className="toast" key={t.id}>
          <span className="dot" />
          <span>Added <strong>{t.name}</strong> to cart</span>
        </div>
      ))}
    </div>
  );
}

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ open, onClose, product, qty, discount, setDiscount, coupon, setCoupon, couponStatus, setCouponStatus, couponError, setCouponError, loggedUser, onCreateAccount }) {
  const [step, setStep]           = useState("form"); // form | otp | details | loading | success | error
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [checkoutUser, setCheckoutUser] = useState(null);
  const [trustedDeviceCheckout, setTrustedDeviceCheckout] = useState(false);
  const [checkoutVerificationTicket, setCheckoutVerificationTicket] = useState("");
  const [phoneStatus, setPhoneStatus] = useState(null);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [priceNotice, setPriceNotice] = useState("");
  const [city, setCity]           = useState("");
  const [area, setArea]           = useState("");
  const [street, setStreet]       = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [orderRef, setOrderRef]   = useState("");
  const [isBusy, setIsBusy]       = useState(false);
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [otpPurpose, setOtpPurpose] = useState("phone"); // phone | address
  const [otpError, setOtpError]   = useState("");
  const [timeLeft, setTimeLeft]   = useState(120);
  const [timerKey, setTimerKey]   = useState(0);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [addressSaveStatus, setAddressSaveStatus] = useState(null);
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressLine1, setNewAddressLine1] = useState("");
  const [newAddressCity, setNewAddressCity] = useState("");
  const [newAddressDistrict, setNewAddressDistrict] = useState("");
  // PAYMENT — new state
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [bkashTxnId, setBkashTxnId] = useState("");
  const [bkashTxnError, setBkashTxnError] = useState("");
  const [showBkashQr, setShowBkashQr] = useState(false);
  const [bkashTxnChecking, setBkashTxnChecking] = useState(false);
  const otpRefs  = useRef([]);
  const timerRef = useRef(null);
  const isMobile = useIsMobile();
  injectMpSheetStyle();

  const activeUser = checkoutUser;
  const pricingOverride = phoneStatus?.phone === normalizeBdMobile(phone) && phoneStatus?.pricing ? phoneStatus.pricing : null;
  const effectiveProduct = pricingOverride
    ? {
        ...product,
        originalPrice: pricingOverride.original_price ?? product.originalPrice,
        salePrice: pricingOverride.sale_price ?? product.salePrice,
        discountAmount: pricingOverride.discount_amount ?? product.discountAmount,
        discountMaxQty: pricingOverride.discount_max_qty ?? product.discountMaxQty,
        discountMaxOrders: pricingOverride.discount_orders_limit ?? product.discountMaxOrders,
        discountBlocked: !!pricingOverride.discount_blocked,
      }
    : product;
  const pricing = calculateProductPricing(effectiveProduct, qty);
  const totalPrice = Math.max(0, pricing.productSubtotal - discount);
  const checkoutCharges = calculateCheckoutCharges(effectiveProduct, qty, { city, area }, totalPrice);
  // PAYMENT — fee override
  const effectiveCodFee = paymentMethod === "bkash" ? 0 : checkoutCharges.codFee;
  const effectiveFinalTotal = checkoutCharges.shippingCost + effectiveCodFee + totalPrice;
  const discountCapMessage = getDiscountCapMessage(effectiveProduct, qty);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fetch saved addresses when modal opens and user is already logged in.
  // Trusted-device checkout gets addresses from /orders/device-status instead.
  useEffect(() => {
    if (open && loggedUser?.id) {
      fetch(`${API_BASE}/me`, {
        credentials: "include",
      })
        .then(r => r.json())
        .then(json => {
          if (json?.ok && json.data?.phone) {
            setCheckoutUser(json.data);
            setName(json.data.name || "");
            setPhone(json.data.phone || "");
            setStep("details");
            setLoadingAddresses(true);
            return fetch(`${API_BASE}/me/addresses`, { credentials: "include" })
              .then(r => r.json())
              .then(addrJson => {
                if (addrJson?.ok && Array.isArray(addrJson.data)) {
                  setSavedAddresses(addrJson.data);
                  const defaultAddr = addrJson.data.find(a => a.is_default) || addrJson.data[0];
                  if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setStreet(defaultAddr.line1 || "");
                    setCity(defaultAddr.city || "");
                    setArea(defaultAddr.district || "");
                  }
                }
              })
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAddresses(false));
    }
  }, [open, loggedUser?.id]);

  // Full reset when modal opens
  useEffect(() => {
    if (open) {
      setStep("form"); setErrorMsg(""); setOrderRef("");
      setOtpDigits(["","","","","",""]); setOtpError("");
      setOtpPurpose("phone");
      setIsBusy(false); setTimerKey(0);
      setCheckoutUser(null); setTrustedDeviceCheckout(false); setCheckoutVerificationTicket("");
      setPhoneStatus(null); setPhoneChecking(false); setPriceNotice("");
      setCity(""); setArea(""); setStreet("");
      setShowAddAddressForm(false);
      setAddressSaveStatus(null);
      setNewAddressLabel(""); setNewAddressLine1(""); setNewAddressCity(""); setNewAddressDistrict("");
      setPaymentMethod("cod");
      setBkashTxnId("");
      setBkashTxnError("");
      setShowBkashQr(false);
      setBkashTxnChecking(false);
      setName("");
      setPhone("");
    }
  }, [open, loggedUser?.phone]);

  const fetchDeviceStatus = async (p, signal) => {
    const res = await fetch(`${API_BASE}/orders/device-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p, ...(product?.id ? { product_id: product.id } : {}) }),
      credentials: "include",
      signal,
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json?.error?.message || "Couldn't check this device.");
    return { ...json.data, phone: p };
  };

  const productWithPricingOverride = (baseProduct, pricingOverride) => pricingOverride
    ? {
        ...baseProduct,
        originalPrice: pricingOverride.original_price ?? baseProduct.originalPrice,
        salePrice: pricingOverride.sale_price ?? baseProduct.salePrice,
        discountAmount: pricingOverride.discount_amount ?? baseProduct.discountAmount,
        discountMaxQty: pricingOverride.discount_max_qty ?? baseProduct.discountMaxQty,
        discountMaxOrders: pricingOverride.discount_orders_limit ?? baseProduct.discountMaxOrders,
        discountBlocked: !!pricingOverride.discount_blocked,
      }
    : baseProduct;

  const showPriceNoticeAlert = (message) => {
    if (!message) return;
    if (window.Swal?.fire) {
      window.Swal.fire({
        icon: "info",
        title: "Regular price applies",
        text: message,
        background: "#FFF3DC",
        color: "#571F29",
        confirmButtonColor: "#571F29",
        confirmButtonText: "Got it",
      });
      return;
    }
    window.alert(message);
  };

  const verifyCheckoutCoupon = async () => {
    if (!coupon.trim() || !setDiscount || !setCouponStatus || !setCouponError) return;
    if (hasProductDiscount(effectiveProduct)) {
      setDiscount(0);
      setCouponStatus("err");
      setCouponError("Coupon codes cannot be used on discounted products.");
      return;
    }

    setCouponStatus("loading");
    setCouponError("");
    try {
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.trim(),
          subtotal: pricing.productSubtotal,
          customer_phone: normalizedPhone,
          ...(product?.id ? { product_id: product.id } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setDiscount(0);
        setCouponStatus("err");
        setCouponError(json?.error?.message || "This coupon can't be used for this order.");
        return;
      }
      setDiscount(json.data.discount);
      setCouponStatus("ok");
      window.mpDismissBannerForCoupon?.(coupon.trim());
    } catch {
      setDiscount(0);
      setCouponStatus("err");
      setCouponError("Could not verify coupon. Please try again.");
    }
  };

  const applyTrustedCheckout = (status) => {
    const user = status?.user;
    if (!user) return;
    localStorage.setItem("mp_user", JSON.stringify(user));
    setCheckoutUser(user);
    setTrustedDeviceCheckout(true);
    setName(user?.name || "");

    const addresses = Array.isArray(status.addresses) ? status.addresses : [];
    setSavedAddresses(addresses);
    const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
    if (defaultAddr) {
      setSelectedAddressId(defaultAddr.id);
      setStreet(defaultAddr.line1 || "");
      setCity(defaultAddr.city || "");
      setArea(defaultAddr.district || "");
      setShowAddAddressForm(false);
    } else {
      setSelectedAddressId("");
    }
  };

  const resetTrustedCheckout = () => {
    setStep("form");
    setCheckoutUser(null);
    setTrustedDeviceCheckout(false);
    setCheckoutVerificationTicket("");
    setPhoneStatus(null);
    setPriceNotice("");
    setSavedAddresses([]);
    setSelectedAddressId("");
    setCity(""); setArea(""); setStreet("");
    setShowAddAddressForm(false);
    setName("");
    setPhone("");
    setErrorMsg("");
    setOtpDigits(["","","","","",""]); setOtpError("");
    setOtpPurpose("phone");
    setTimeout(() => document.querySelector('input[type="tel"]')?.focus(), 50);
  };

  useEffect(() => {
    if (!open || loggedUser?.phone || step !== "form") return;
    const p = normalizeBdMobile(phone);
    if (!isValidBdMobile(p)) {
      setPhoneStatus(null);
      setPhoneChecking(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPhoneChecking(true);
      try {
        const status = await fetchDeviceStatus(p, controller.signal);
        setPhoneStatus(status);
        setPriceNotice(status?.pricing?.message || "");
        if (status.trusted) {
          setPhone(p);
          applyTrustedCheckout(status);
          setStep("details");
        }
      } catch (err) {
        if (err.name !== "AbortError") setPhoneStatus(null);
      } finally {
        if (!controller.signal.aborted) setPhoneChecking(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, loggedUser?.phone, step, phone]);

  // 2-minute countdown -  starts/resets whenever we enter the OTP step
  useEffect(() => {
    if (step !== "otp") return;
    setTimeLeft(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return t - 1;
      });
    }, 1000);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, timerKey]);

  useEffect(() => {
    if (!open || paymentMethod !== "bkash") {
      setBkashTxnChecking(false);
      return;
    }

    const txnId = bkashTxnId.trim().toUpperCase();
    if (!BKASH_TXN_ID_PATTERN.test(txnId)) {
      setBkashTxnChecking(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setBkashTxnChecking(true);
      try {
        const res = await fetch(`${API_BASE}/orders/bkash-txn/check?txn_id=${encodeURIComponent(txnId)}`);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (json?.ok && json.data?.exists) {
          setBkashTxnError("This bKash transaction ID has already been used. Please check and enter a unique transaction ID.");
        }
      } catch {
        /* Duplicate check is advisory; submit still has server-side protection. */
      } finally {
        if (!cancelled) setBkashTxnChecking(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, paymentMethod, bkashTxnId]);

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!open) return null;

  const composedAddress = street.trim();
  const normalizedPhone = normalizeBdMobile(phone);
  const phoneStatusReady = phoneStatus?.phone === normalizedPhone;
  const guestTrustedDevice = !loggedUser?.phone && phoneStatusReady && phoneStatus.trusted;
  const guestNeedsOtp = !loggedUser?.phone && phoneStatusReady && !phoneStatus.trusted;
  const phoneStatusHint = phoneChecking
    ? "Checking this number..."
    : guestTrustedDevice
      ? "This device is verified for faster checkout."
      : guestNeedsOtp
        ? "We'll send a verification code for this phone."
        : "Cash on delivery";

  // ── Shared styles ──────────────────────────────────────────────────────────
  const overlay = isMobile
    ? { position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }
    : { position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
  // maxHeight + scroll: on short viewports (landscape phones, keyboard open)
  // the form must stay reachable instead of clipping behind overflow:hidden.
  const panel   = isMobile
    ? { background: "#F7E3C9", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "100%", maxHeight: "92dvh", overflowY: "auto", overflowX: "hidden", boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", animation: "mpSheetSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }
    : { background: "#FFFDF7", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.28)", maxHeight: "92dvh", overflowY: "auto", overflowX: "hidden" };
  const sheetHandle = isMobile ? (
    <div style={{
      width: 36, height: 4, borderRadius: 2,
      background: "rgba(87,31,41,0.2)",
      margin: "10px auto 4px", flexShrink: 0
    }} aria-hidden="true" />
  ) : null;
  const field   = { width: "100%", padding: "9px 12px", fontFamily: "var(--font-body)", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" };
  const lbl     = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(87,31,41,.65)", marginBottom: 5, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".04em" };
  const hdr     = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 22px 14px" : "18px 22px 14px", borderBottom: "1px solid rgba(87,31,41,.1)" };
  const primBtn = (busy) => ({ width: "100%", padding: 14, background: busy ? "rgba(87,31,41,.35)" : "#571F29", color: "#fff", borderRadius: 10, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .2s" });

  // ── Order summary strip ────────────────────────────────────────────────────
  const SummaryStrip = () => {
    const productLabel = `${effectiveProduct.name} - ${effectiveProduct.weight} × ${qty}`;
    const offerActive = !effectiveProduct.discountBlocked && pricing.productDiscountTotal > 0;
    const displayedProductTotal = totalPrice;

    return (
      <div className="checkout-summary-card">
        <div className="checkout-summary-product">
          <span className="checkout-summary-name">{productLabel}</span>
          <span className="checkout-summary-price">
            {offerActive ? (
              <>
                <span className="checkout-summary-original">৳{pricing.originalSubtotal.toLocaleString()}</span>
                <strong>৳{displayedProductTotal.toLocaleString()}</strong>
              </>
            ) : (
              <strong>৳{displayedProductTotal.toLocaleString()}</strong>
            )}
          </span>
        </div>
        {offerActive && (
          <div className="checkout-summary-offer">
            <span className="checkout-summary-badge" aria-label={`Discount: ৳${pricing.productDiscountTotal.toLocaleString()} off`}>
              ৳{pricing.productDiscountTotal.toLocaleString()} OFF
            </span>
            <span>{effectiveProduct.discountLabel || "Product offer"}{discountCapMessage ? ` · ${discountCapMessage}` : ""}</span>
          </div>
        )}
        <div className="checkout-summary-divider" />
        {/* PAYMENT — SummaryStrip update */}
        <div className="checkout-summary-breakdown">
          <div><span>Delivery</span><strong>৳{checkoutCharges.shippingCost.toLocaleString()}</strong></div>
          {paymentMethod === "cod" && (
            <div><span>COD charge (1%)</span><strong>৳{effectiveCodFee.toLocaleString()}</strong></div>
          )}
          {paymentMethod === "bkash" && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#1a9a50", fontWeight: 600 }}>bKash — no COD charge</span>
              <strong style={{ color: "#1a9a50" }}>৳0</strong>
            </div>
          )}
        </div>
        {discount > 0 && (
          <div className="checkout-summary-coupon">
            <span>Coupon</span><strong>-৳{discount.toLocaleString()}</strong>
          </div>
        )}
        <div className="checkout-summary-total"><span>Total</span><strong>৳{effectiveFinalTotal.toLocaleString()}</strong></div>
      </div>
    );
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === "success") return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, maxHeight: isMobile ? "92dvh" : "90dvh", overflowY: "auto" }}>
        {sheetHandle}
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(46,94,31,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 26, color: "#2E5E1F" }} aria-hidden="true" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#571F29", margin: "0 0 6px" }}>Order Placed!</h2>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#FF9100", margin: "0 0 10px" }}>#{orderRef}</p>
          {/* PAYMENT — success screen */}
          {paymentMethod === "bkash" ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "rgba(87,31,41,.65)", margin: "0 0 18px", lineHeight: 1.5 }}>
              Your order <strong>#{orderRef}</strong> is under review.
              Our team is verifying your bKash transaction (<strong>{bkashTxnId}</strong>).
              You will receive an SMS confirmation at <strong>{phone}</strong> within 30 minutes.
            </p>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "rgba(87,31,41,.65)", margin: "0 0 18px", lineHeight: 1.5 }}>
              A confirmation SMS has been sent to <strong>{phone}</strong>.
            </p>
          )}
          {typeof MPFeedbackCard === "function" && <MPFeedbackCard orderRef={orderRef} />}
          {!activeUser && (
            <div className="shop-post-order-member">
              <div className="shop-post-order-badge">MIDNIGHT CIRCLE</div>
              <strong>Save this order and collect points.</strong>
              <span>Create an account to track your pouch, save your address, collect Midnight Points, and manage future monthly plans.</span>
              <button onClick={() => { onClose(); onCreateAccount?.(); }}>Create My Account</button>
            </div>
          )}
          <button onClick={onClose} style={{ padding: "12px 36px", background: "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Done</button>
        </div>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (step === "error") return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        {sheetHandle}
        <div style={{ padding: "36px 28px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(200,40,40,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <i className="fa-solid fa-circle-xmark" style={{ fontSize: 28, color: "#C82828" }} aria-hidden="true" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#571F29", margin: "0 0 10px" }}>Something went wrong</h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(87,31,41,.7)", margin: "0 0 24px", lineHeight: 1.5 }}>{errorMsg}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => setStep("form")} style={{ padding: "11px 24px", background: "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Try Again</button>
            <button onClick={onClose} style={{ padding: "11px 24px", background: "rgba(87,31,41,.08)", color: "#571F29", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── OTP Step ───────────────────────────────────────────────────────────────
  if (step === "otp") {
    const otpComplete = otpDigits.every(d => d !== "");

    const handleDigit = (idx, val) => {
      if (!/^\d*$/.test(val)) return;
      const d = [...otpDigits]; d[idx] = val.slice(-1);
      setOtpDigits(d);
      if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleKey = (idx, e) => {
      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
        const d = [...otpDigits]; d[idx - 1] = "";
        setOtpDigits(d);
        otpRefs.current[idx - 1]?.focus();
      }
    };

    const handlePaste = (e) => {
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      e.preventDefault();
      const d = Array(6).fill(""); pasted.split("").forEach((c, i) => { d[i] = c; });
      setOtpDigits(d);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleVerify = async () => {
      if (!otpComplete || isBusy) return;
      setIsBusy(true); setOtpError("");
      try {
        if (otpPurpose === "address") {
          let order;
          try {
            const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: normalizedPhone, otp: otpDigits.join(""), purpose: "change_address" }),
              credentials: "include",
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson.ok) {
              const err = new Error(verifyJson?.error?.message || "Invalid OTP.");
              err.code = verifyJson?.error?.code;
              throw err;
            }
            order = await placeQuickOrder(verifyJson.data.verification_ticket);
          } catch (err) {
            if (err.code === "INVALID_OTP" || err.code === "OTP_MAX_ATTEMPTS") {
              setOtpError(err.message);
              return;
            }
            throw err;
          }
          setOrderRef(order.order_ref);
          setStep("success");
          return;
        }

        const res  = await fetch(`${API_BASE}/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, otp: otpDigits.join(""), purpose: "checkout" }),
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) {
          const code = json?.error?.code;
          if (code === "INVALID_OTP" || code === "OTP_MAX_ATTEMPTS") {
            setOtpError(json.error.message);
          } else {
            setErrorMsg(json?.error?.message || "Order failed. Please try again.");
            setStep("error");
          }
          return;
        }
        const user = json.data.user;
        localStorage.setItem("mp_user", JSON.stringify(user));
        setCheckoutUser(user);
        setTrustedDeviceCheckout(false);
        setCheckoutVerificationTicket(json.data.verification_ticket || "");
        const nextPhoneStatus = phoneStatus?.phone === normalizedPhone
          ? { ...phoneStatus, trusted: true, user, addresses: savedAddresses }
          : { phone: normalizedPhone, trusted: true, user, addresses: savedAddresses };
        setPhoneStatus(nextPhoneStatus);
        setPriceNotice(nextPhoneStatus?.pricing?.message || "");
        try {
          const refreshedStatus = await fetchDeviceStatus(normalizedPhone);
          setPhoneStatus(refreshedStatus);
          if (Array.isArray(refreshedStatus.addresses)) setSavedAddresses(refreshedStatus.addresses);
          const refreshedMessage = refreshedStatus?.pricing?.message || "";
          setPriceNotice(refreshedMessage);
          showPriceNoticeAlert(refreshedMessage);
        } catch {
          showPriceNoticeAlert(nextPhoneStatus?.pricing?.message || "");
        }
        if (user?.name) setName(user.name);
        setStep("details");
      } catch (err) {
        setErrorMsg(err.message);
        setStep("error");
      } finally {
        setIsBusy(false);
      }
    };

    const resendOtp = async () => {
      try {
        await fetch(`${API_BASE}/orders/request-otp`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, purpose: otpPurpose === "address" ? "change_address" : "checkout" }),
        });
        setOtpDigits(["","","","","",""]); setOtpError("");
        setTimerKey(k => k + 1);
      } catch {}
    };

    return (
      <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={panel}>
          {sheetHandle}
          {/* Header */}
          <div style={hdr}>
            <button onClick={() => setStep(otpPurpose === "address" ? "details" : "form")} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "#571F29" }}>Verify Phone</span>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontSize: 20, lineHeight: 1 }}>×</button>
          </div>

          <SummaryStrip />

          <div style={{ padding: "26px 22px 24px" }}>
            {/* Instruction */}
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(87,31,41,.75)", margin: "0 0 22px", textAlign: "center", lineHeight: 1.5 }}>
              {otpPurpose === "address" ? "Confirm this new delivery address with the 6-digit code sent to" : "Enter the 6-digit code sent to"}<br />
              <strong style={{ color: "#571F29" }}>{phone}</strong>
            </p>

            {/* 6-box input — flexes down so all six always fit the panel width */}
            <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 18 }}>
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1}
                  value={otpDigits[i]}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)}
                  onPaste={handlePaste}
                  disabled={isBusy}
                  style={{ flex: "1 1 0", minWidth: 0, maxWidth: 46, height: 52, padding: 0, boxSizing: "border-box", textAlign: "center", fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", border: `2px solid ${otpDigits[i] ? "#571F29" : "rgba(87,31,41,.22)"}`, borderRadius: 10, background: otpDigits[i] ? "rgba(87,31,41,.04)" : "#fff", color: "#571F29", outline: "none", transition: "border-color .15s, background .15s" }}
                />
              ))}
            </div>

            {/* OTP error */}
            {otpError && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#C82828", textAlign: "center", margin: "0 0 12px", background: "rgba(200,40,40,.06)", padding: "8px 12px", borderRadius: 7 }}>
                <i className="fa-solid fa-circle-xmark" aria-hidden="true" style={{ marginRight: 5 }} />{otpError}
              </p>
            )}

            {/* Timer / Resend */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {timeLeft > 0 ? (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.5)" }}>
                  <i className="fa-regular fa-clock" aria-hidden="true" style={{ marginRight: 5 }} />
                  Resend in <strong style={{ color: "#571F29", fontVariantNumeric: "tabular-nums" }}>{fmtTime(timeLeft)}</strong>
                </span>
              ) : (
                <button onClick={resendOtp} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#FF9100", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" style={{ marginRight: 5 }} />Resend OTP
                </button>
              )}
            </div>

            {/* Confirm button */}
            <button onClick={handleVerify} disabled={!otpComplete || isBusy} style={primBtn(!otpComplete || isBusy)}>
              {isBusy
                ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Verifying…</>
                : <><i className="fa-solid fa-check" aria-hidden="true" /> Verify & Continue</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phone Step ─────────────────────────────────────────────────────────────
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || isBusy) return;
    if (!isValidBdMobile(phone)) {
      setErrorMsg("Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX.");
      return;
    }
    setPhone(normalizedPhone);
    setIsBusy(true);

    try {
      let status = phoneStatus?.phone === normalizedPhone ? phoneStatus : null;
      if (!status) {
        setPhoneChecking(true);
        status = await fetchDeviceStatus(normalizedPhone);
        setPhoneStatus(status);
        setPriceNotice(status?.pricing?.message || "");
        setPhoneChecking(false);
      }
      setPriceNotice(status?.pricing?.message || "");
      const statusProduct = productWithPricingOverride(product, status?.pricing);
      const statusPricing = calculateProductPricing(statusProduct, qty);

      if (status.trusted) {
        applyTrustedCheckout(status);
        setStep("details");
        setPriceNotice(status?.pricing?.message || "");
        return;
      }

      if (coupon) {
        if (hasProductDiscount(statusProduct)) {
          setErrorMsg("Coupon codes cannot be used on discounted products.");
          setStep("error");
          return;
        }
        const vres = await fetch(`${API_BASE}/coupons/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: coupon, subtotal: statusPricing.productSubtotal, customer_phone: normalizedPhone, ...(product?.id ? { product_id: product.id } : {}) }),
        });
        const vjson = await vres.json().catch(() => null);
        if (!vres.ok) {
          setErrorMsg(vjson?.error?.message || "This coupon can't be used for this order.");
        setStep("error");
        return;
      }
      window.mpDismissBannerForCoupon?.(coupon);
    }

    const res = await fetch(`${API_BASE}/orders/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, purpose: "checkout" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(checkoutApiErrorMessage(json?.error, "Failed to send OTP."));
      setOtpDigits(["","","","","",""]); setOtpError("");
      setOtpPurpose("phone");
      setStep("otp");
    } catch (err) {
      setErrorMsg(err.message);
      setStep("error");
    } finally {
      setPhoneChecking(false);
      setIsBusy(false);
    }
  };

  const placeQuickOrder = async (verificationTicket = null) => {
    const trustedCheckout = trustedDeviceCheckout && !!checkoutUser?.phone;
    const ticketCheckout = !!checkoutVerificationTicket && !trustedCheckout;
    const quickCheckout = !trustedCheckout && !ticketCheckout && !!loggedUser?.id;
    const endpoint = ticketCheckout
      ? `${API_BASE}/orders/guest`
      : trustedCheckout
        ? `${API_BASE}/orders/trusted`
        : quickCheckout
          ? `${API_BASE}/orders/quick`
          : `${API_BASE}/orders/guest`;
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(trustedCheckout ? { phone: normalizedPhone } : {}),
        ...(ticketCheckout ? { phone: normalizedPhone, name: name.trim(), verification_ticket: checkoutVerificationTicket } : {}),
        ...(verificationTicket ? { verification_ticket: verificationTicket } : {}),
        qty,
        address: composedAddress,
        city,
        district: area,
        ...(coupon ? { coupon_code: coupon } : {}),
        ...(product?.id ? { product_id: product.id } : {}),
        // PAYMENT — API payload
        payment_method: paymentMethod,
        ...(paymentMethod === "bkash" && bkashTxnId.trim()
          ? { bkash_txn_id: bkashTxnId.trim().toUpperCase() }
          : {}),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json?.error?.message || "Order failed. Please try again.");
      err.code = json?.error?.code;
      throw err;
    }
    return json.data;
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    const hasAddress = Boolean(city && area && street.trim());
    if (!name.trim() || !hasAddress || isBusy) return;

    setIsBusy(true); setErrorMsg("");
    try {
      // PAYMENT — validation
      if (paymentMethod === "bkash") {
        if (!bkashTxnId.trim()) {
          setBkashTxnError("Please enter your bKash transaction ID.");
          setIsBusy(false);
          return;
        }
        if (!BKASH_TXN_ID_PATTERN.test(bkashTxnId.trim().toUpperCase())) {
          setBkashTxnError(BKASH_TXN_ID_PATTERN_MESSAGE);
          setIsBusy(false);
          return;
        }
        if (bkashTxnError) {
          setIsBusy(false);
          return;
        }
      }

      if (trustedDeviceCheckout && !selectedAddressId) {
        const res = await fetch(`${API_BASE}/orders/request-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, purpose: "change_address" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(checkoutApiErrorMessage(json?.error, "Failed to send OTP."));
        setOtpDigits(["","","","","",""]); setOtpError("");
        setOtpPurpose("address");
        setTimerKey(k => k + 1);
        setStep("otp");
        return;
      }

      if (loggedUser?.id && !checkoutVerificationTicket && (!activeUser?.name || activeUser.name !== name.trim())) {
        const profileRes = await fetch(`${API_BASE}/me`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const profileJson = await profileRes.json();
        if (!profileRes.ok || !profileJson.ok) throw new Error(profileJson?.error?.message || "Couldn't save your name.");
        const updatedUser = { ...checkoutUser, ...profileJson.data };
        localStorage.setItem("mp_user", JSON.stringify(updatedUser));
        setCheckoutUser(updatedUser);
      }

      if (loggedUser?.id && !checkoutVerificationTicket && !selectedAddressId) {
        await fetch(`${API_BASE}/me/addresses`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: "Delivery",
            line1: composedAddress,
            city,
            district: area,
            is_default: true,
          }),
        }).catch(() => null);
      }

      const order = await placeQuickOrder();
      setOrderRef(order.order_ref);
      setStep("success");
    } catch (err) {
      if (err.code === "DUPLICATE_BKASH_TXN") {
        setBkashTxnError(err.message || "This bKash transaction ID has already been used. Please check and enter a unique transaction ID.");
        return;
      }
      if (err.code === "UNAUTHORIZED") {
        setCheckoutUser(null);
        setTrustedDeviceCheckout(false);
        setCheckoutVerificationTicket("");
        setPhoneStatus(null);
        setErrorMsg("Please verify your phone number to continue checkout.");
        setStep("form");
        return;
      }
      setErrorMsg(err.message);
      setStep("error");
    } finally {
      setIsBusy(false);
    }
  };

  const hasAddress = Boolean(city && area && street.trim());
  const needsNameEntry = !activeUser?.name;
  const canSubmitPhone = isValidBdMobile(phone) && !isBusy && !phoneChecking;
  const bkashValid = paymentMethod !== "bkash" || (BKASH_TXN_ID_PATTERN.test(bkashTxnId.trim().toUpperCase()) && !bkashTxnError && !bkashTxnChecking);
  const canSubmitDetails = (!needsNameEntry || name.trim()) && hasAddress && !isBusy && bkashValid;

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {sheetHandle}
        <div style={hdr}>
          <span id="modal-title" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#571F29" }}>Place Order</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={step === "details" ? handleDetailsSubmit : handlePhoneSubmit} className="checkout-modal-body">
          <SummaryStrip />
          {activeUser?.phone && (
            <div className="checkout-identity-card">
              <div className="checkout-identity-phone">
                <span className="checkout-identity-check" aria-hidden="true">✓</span>
                <span className="checkout-identity-phone-text">
                  <span>Phone confirmed</span>
                  <strong aria-label={`Confirmed phone: ${phone}`}>{phone}</strong>
                </span>
                <button type="button" onClick={resetTrustedCheckout} aria-label="Use a different phone number">Change</button>
              </div>
              {!needsNameEntry && (
                <div className="checkout-identity-user">
                  <span className="checkout-identity-avatar" aria-hidden="true">
                    {String(name || "MP").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>Ordering for this account</small>
                  </span>
                </div>
              )}
            </div>
          )}

          {step === "form" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Phone Number</label>
                <input style={field} type="tel" placeholder="01XXXXXXXXX" value={phone}
                  onChange={e => {
                    setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20));
                    setErrorMsg("");
                  }} required disabled={isBusy} autoComplete="tel" autoFocus />
                {phone.trim() && !isValidBdMobile(phone) && (
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#C82828", marginTop: 6 }}>
                    Use a Bangladesh mobile number: 013-019, 11 digits locally or +880 format.
                  </div>
                )}
                {isValidBdMobile(phone) && (
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(87,31,41,.55)", marginTop: 6 }}>
                    {phoneStatusHint}
                  </div>
                )}
                {priceNotice && (
                  <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 8, background: "rgba(255,145,0,.08)", border: "1px solid rgba(255,145,0,.22)", color: "#B36200", fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.45 }}>
                    <i className="fa-solid fa-circle-info" aria-hidden="true" style={{ marginRight: 6 }} />
                    {priceNotice}
                  </div>
                )}
              </div>

            </>
          )}

          {step === "details" && (
            <>
              {needsNameEntry ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Full Name</label>
                  <input style={field} type="text" placeholder="Your full name" value={name}
                    onChange={e => setName(e.target.value)} required disabled={isBusy} autoFocus={!name} autoComplete="name" />
                </div>
              ) : null}

              {effectiveProduct.discountBlocked && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Coupon Code</label>
                  <div className="shop-coupon-row" style={{ margin: 0 }}>
                    <div className="shop-coupon-wrap" style={{ flexDirection: "row", borderRadius: 8 }}>
                      <input
                        className={"shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : "")}
                        type="text"
                        placeholder="Enter coupon code"
                        value={coupon}
                        onChange={e => {
                          setCoupon?.(e.target.value.toUpperCase());
                          setCouponStatus?.("idle");
                          setCouponError?.("");
                          setDiscount?.(0);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            verifyCheckoutCoupon();
                          }
                        }}
                        aria-label="Coupon code"
                        disabled={isBusy}
                      />
                      <button
                        type="button"
                        className="shop-coupon-btn"
                        onClick={verifyCheckoutCoupon}
                        disabled={isBusy || couponStatus === "loading" || !coupon.trim()}
                        style={{ borderRadius: 0, padding: "0 18px" }}
                      >
                        {couponStatus === "loading" ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : "Apply"}
                      </button>
                    </div>
                    {couponStatus === "ok" && (
                      <span className="shop-coupon-msg shop-coupon-msg--ok">
                        <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied - ৳{discount} off
                      </span>
                    )}
                    {couponStatus === "err" && (
                      <span className="shop-coupon-msg shop-coupon-msg--err">
                        <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {couponError}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* PAYMENT — selector UI */}
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#999",
                marginBottom: 8, fontFamily: "var(--font-display)"
              }}>
                Payment Method
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, marginBottom: 16
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("cod");
                    setBkashTxnId("");
                    setBkashTxnError("");
                    setShowBkashQr(false);
                    setBkashTxnChecking(false);
                  }}
                  style={{
                    padding: "12px 10px",
                    minHeight: 164,
                    height: 164,
                    borderRadius: 12,
                    border: paymentMethod === "cod"
                      ? "2px solid #571F29"
                      : "1.5px solid #e0e0e0",
                    background: paymentMethod === "cod"
                      ? "rgba(87,31,41,0.06)"
                      : "#fff",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6,
                    justifyContent: "center",
                    transition: "all 0.15s",
                    boxSizing: "border-box",
                  }}
                  aria-pressed={paymentMethod === "cod"}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: paymentMethod === "cod"
                      ? "rgba(87,31,41,0.1)" : "rgba(0,0,0,0.04)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className="fa-solid fa-money-bill-wave"
                       aria-hidden="true"
                       style={{
                         fontSize: 16,
                         color: paymentMethod === "cod" ? "#571F29" : "#aaa"
                       }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800, fontSize: 13,
                    color: paymentMethod === "cod" ? "#571F29" : "#999"
                  }}>
                    Cash on Delivery
                  </span>
                  <span style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 10.5, color: "#aaa", lineHeight: 1.35,
                    textAlign: "center"
                  }}>
                    Pay when you receive
                  </span>
                  {paymentMethod === "cod" && (
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#571F29",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", marginTop: 2
                    }}>
                      <i className="fa-solid fa-check"
                         aria-hidden="true"
                       style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                  )}
                  {paymentMethod !== "cod" && (
                    <div style={{ width: 18, height: 18, marginTop: 2 }} aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("bkash");
                    setBkashTxnId("");
                    setBkashTxnError("");
                    setShowBkashQr(false);
                    setBkashTxnChecking(false);
                  }}
                  style={{
                    padding: "12px 10px",
                    minHeight: 164,
                    height: 164,
                    borderRadius: 12,
                    border: paymentMethod === "bkash"
                      ? "2px solid #E2136E"
                      : "1.5px solid #e0e0e0",
                    background: paymentMethod === "bkash"
                      ? "#FDE8F2" : "#fff",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6,
                    justifyContent: "center",
                    transition: "all 0.15s",
                    boxSizing: "border-box",
                  }}
                  aria-pressed={paymentMethod === "bkash"}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: paymentMethod === "bkash"
                      ? "rgba(226,19,110,0.12)" : "rgba(0,0,0,0.04)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className="fa-solid fa-mobile-screen-button"
                       aria-hidden="true"
                       style={{
                         fontSize: 16,
                         color: paymentMethod === "bkash" ? "#E2136E" : "#aaa"
                       }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800, fontSize: 13,
                    color: paymentMethod === "bkash" ? "#E2136E" : "#999"
                  }}>
                    bKash
                  </span>
                  <span style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 10.5, color: "#aaa", lineHeight: 1.35,
                    textAlign: "center"
                  }}>
                    No extra charge
                  </span>
                  {paymentMethod === "bkash" && (
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#E2136E",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", marginTop: 2
                    }}>
                      <i className="fa-solid fa-check"
                         aria-hidden="true"
                       style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                  )}
                  {paymentMethod !== "bkash" && (
                    <div style={{ width: 18, height: 18, marginTop: 2 }} aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* PAYMENT — bKash panel */}
              {paymentMethod === "bkash" && (
                <div style={{
                  background: "#FDE8F2",
                  border: "1.5px solid rgba(226,19,110,0.25)",
                  borderRadius: 14,
                  padding: "16px 16px 14px",
                  marginBottom: 16,
                  display: "flex", flexDirection: "column", gap: 14
                }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(226,19,110,0.12)", flexShrink: 0,
                      display: "flex", alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="fa-solid fa-circle-info"
                         aria-hidden="true"
                         style={{ color: "#E2136E", fontSize: 16 }} />
                    </div>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: 12.5,
                      color: "#8B0040", lineHeight: 1.55, margin: 0
                    }}>
                      Send <strong>৳{effectiveFinalTotal.toLocaleString()}</strong> to
                      our bKash merchant number below.
                      Then enter your transaction ID to complete the order.
                    </p>
                  </div>

                  <div style={{
                    display: "flex", flexDirection: "column", gap: 10
                  }}>
                    <div style={{
                      width: "100%",
                      background: "#fff",
                      border: "1px solid rgba(226,19,110,0.2)",
                      borderRadius: 10, padding: "10px 14px",
                      boxSizing: "border-box"
                    }}>
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: 10.5,
                        fontWeight: 700, color: "#E2136E",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        marginBottom: 4
                      }}>
                        bKash Merchant Number
                      </div>
                      <div style={{
                        fontFamily: "var(--font-display)", fontWeight: 900,
                        fontSize: 20, color: "#571F29",
                        letterSpacing: "0.03em", fontVariantNumeric: "tabular-nums"
                      }}>
                        {BKASH_MERCHANT_NUMBER}
                      </div>
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: 11,
                        color: "rgba(139,0,64,0.6)", marginTop: 3
                      }}>
                        (Merchant account)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(BKASH_MERCHANT_NUMBER);
                        }}
                        style={{
                          marginTop: 8, padding: "5px 12px",
                          background: "rgba(226,19,110,0.1)",
                          border: "1px solid rgba(226,19,110,0.22)",
                          borderRadius: 6, cursor: "pointer",
                          fontFamily: "var(--font-display)",
                          fontSize: 11, fontWeight: 700, color: "#E2136E",
                          display: "flex", alignItems: "center", gap: 5
                        }}
                      >
                        <i className="fa-solid fa-copy"
                           aria-hidden="true" style={{ fontSize: 10 }} />
                        Copy number
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBkashQr(v => !v)}
                      aria-expanded={showBkashQr}
                      style={{
                        alignSelf: "flex-start",
                        padding: "7px 12px",
                        background: "rgba(226,19,110,0.08)",
                        border: "1px solid rgba(226,19,110,0.2)",
                        borderRadius: 8,
                        color: "#E2136E",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <i className="fa-solid fa-qrcode" aria-hidden="true" style={{ fontSize: 11 }} />
                      {showBkashQr ? "Hide QR code" : "Show QR code"}
                    </button>

                    {showBkashQr && (
                      <div style={{
                        width: "100%",
                        background: "#fff",
                        border: "1px solid rgba(226,19,110,0.2)",
                        borderRadius: 12,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxSizing: "border-box"
                      }}>
                        <img
                          src={BKASH_QR_IMAGE_PATH}
                          alt="bKash QR code for payment"
                          style={{
                            width: "min(100%, 220px)",
                            height: "auto",
                            maxHeight: 220,
                            borderRadius: 8,
                            objectFit: "contain"
                          }}
                          onError={e => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling.style.display = "flex";
                          }}
                        />
                        <div style={{
                          display: "none", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          width: "100%", minHeight: 120, gap: 6
                        }}>
                          <i className="fa-solid fa-qrcode"
                             aria-hidden="true"
                             style={{ fontSize: 38, color: "#E2136E" }} />
                          <span style={{
                            fontSize: 11, color: "#E2136E",
                            fontFamily: "var(--font-display)",
                            fontWeight: 800, textAlign: "center"
                          }}>
                            QR Code
                          </span>
                        </div>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: 10.5,
                          color: "rgba(139,0,64,0.6)", textAlign: "center"
                        }}>
                          Scan to pay
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: "block", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: "#8B0040", marginBottom: 6,
                      fontFamily: "var(--font-display)"
                    }}>
                      bKash Transaction ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABC1234567"
                      value={bkashTxnId}
                      onChange={e => {
                        setBkashTxnId(e.target.value.trim().toUpperCase());
                        setBkashTxnError("");
                      }}
                      maxLength={10}
                      disabled={isBusy}
                      aria-label="bKash transaction ID"
                      style={{
                        width: "100%", padding: "10px 12px",
                        fontSize: 14, fontFamily: "var(--font-body)",
                        fontWeight: 600, letterSpacing: "0.04em",
                        border: bkashTxnError
                          ? "1.5px solid #C82828"
                          : bkashTxnId
                            ? "1.5px solid #E2136E"
                            : "1.5px solid rgba(226,19,110,0.3)",
                        borderRadius: 8, background: "#fff",
                        color: "#1a0a0d", outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s"
                      }}
                    />
                    {bkashTxnError && (
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: 12,
                        color: "#C82828", marginTop: 5, display: "flex",
                        alignItems: "center", gap: 5
                      }}>
                        <i className="fa-solid fa-circle-xmark"
                           aria-hidden="true" />
                        {bkashTxnError}
                      </div>
                    )}
                    {bkashTxnChecking && !bkashTxnError && (
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: 12,
                        color: "#8B0040", marginTop: 5, display: "flex",
                        alignItems: "center", gap: 5
                      }}>
                        <i className="fa-solid fa-spinner fa-spin"
                           aria-hidden="true" />
                        Checking transaction ID...
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: "rgba(226,19,110,0.06)",
                    border: "1px solid rgba(226,19,110,0.15)",
                    borderRadius: 8, padding: "9px 12px",
                    display: "flex", alignItems: "flex-start", gap: 8
                  }}>
                    <i className="fa-solid fa-clock"
                       aria-hidden="true"
                       style={{
                         color: "#E2136E", fontSize: 13,
                         marginTop: 1, flexShrink: 0
                       }} />
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: 12,
                      color: "#8B0040", lineHeight: 1.5, margin: 0
                    }}>
                      After placing your order, our team will verify your bKash
                      transaction and confirm your order within <strong>30 minutes</strong>.
                      You will receive an SMS confirmation once verified.
                    </p>
                  </div>
                </div>
              )}

          {/* ── Delivery Address ── */}
          <div className="checkout-address-section">
            <label className="checkout-section-label">Delivery address</label>

            {/* Saved addresses section (logged in users) */}
            {activeUser?.id && savedAddresses.length > 0 && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ position: "relative" }}>
                    <select
                      style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: "pointer", color: selectedAddressId ? "#1A0A0D" : "rgba(26,10,13,.38)" }}
                      value={selectedAddressId}
                      onChange={e => {
                        setSelectedAddressId(e.target.value);
                        setShowAddAddressForm(false);
                        if (e.target.value) {
                          const addr = savedAddresses.find(a => a.id === e.target.value);
                          if (addr) {
                            setStreet(addr.line1);
                            setCity(addr.city || "");
                            setArea(addr.district || "");
                          }
                        }
                      }}
                      disabled={isBusy || loadingAddresses}
                    >
                      <option value="">Choose a saved address</option>
                      {savedAddresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                          {addr.label ? `${addr.label} - ${addr.line1.substring(0, 30)}${addr.line1.length > 30 ? '…' : ''}` : addr.line1.substring(0, 50)}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressId("");
                    setAddressSaveStatus(null);
                    setShowAddAddressForm(v => !v);
                  }}
                  className="checkout-add-address-btn"
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: 4 }} />
                  {showAddAddressForm ? "Use manual address" : "Add new address"}
                </button>
              </>
            )}

            {/* No addresses prompt (logged in but no saved addresses) */}
            {activeUser?.id && savedAddresses.length === 0 && !showAddAddressForm && !loadingAddresses && (
              <div style={{ padding: "12px 12px", background: "rgba(255,145,0,.08)", borderRadius: 8, border: "1px solid rgba(255,145,0,.2)", marginBottom: 12 }}>
                <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.75)", fontWeight: 600 }}>
                  <i className="fa-solid fa-location-dot" aria-hidden="true" style={{ marginRight: 6, color: "#FF9100" }} />
                  Save an address for faster checkout next time
                </p>
                <button
                  type="button"
                  onClick={() => { setAddressSaveStatus(null); setShowAddAddressForm(true); }}
                  className="checkout-add-address-btn"
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: 4 }} />
                  Add new address
                </button>
              </div>
            )}

            {/* Add new address form */}
            {(showAddAddressForm || (activeUser?.id && savedAddresses.length === 0)) && (
              <div style={{ background: "rgba(87,31,41,.04)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ ...lbl, fontSize: 11, marginBottom: 4 }}>Address Label (e.g., Home, Office)</label>
                  <input
                    style={field}
                    type="text"
                    placeholder="Address label"
                    value={newAddressLabel}
                    onChange={e => { setNewAddressLabel(e.target.value); setAddressSaveStatus(null); }}
                    disabled={isBusy}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ ...lbl, fontSize: 11, marginBottom: 4 }}>Street Address</label>
                  <input
                    style={field}
                    type="text"
                    placeholder="House no., road, block, building…"
                    value={newAddressLine1}
                    onChange={e => { setNewAddressLine1(e.target.value); setAddressSaveStatus(null); }}
                    disabled={isBusy}
                  />
                </div>

                <div className="checkout-address-grid">
                  <div style={{ position: "relative" }}>
                    <label style={{ ...lbl, fontSize: 11, marginBottom: 4, display: "block" }}>City *</label>
                    <select
                      style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: "pointer", color: newAddressCity ? "#1A0A0D" : "rgba(26,10,13,.38)" }}
                      value={newAddressCity}
                      onChange={e => { setNewAddressCity(e.target.value); setNewAddressDistrict(""); setAddressSaveStatus(null); }}
                      required
                      disabled={isBusy}
                    >
                      <option value="">City</option>
                      {Object.keys(BD_AREAS).sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, bottom: "50%", transform: "translateY(50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <label style={{ ...lbl, fontSize: 11, marginBottom: 4, display: "block" }}>District/Area *</label>
                    <select
                      style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: newAddressCity ? "pointer" : "not-allowed", color: newAddressDistrict ? "#1A0A0D" : "rgba(26,10,13,.38)", opacity: newAddressCity ? 1 : 0.55 }}
                      value={newAddressDistrict}
                      onChange={e => { setNewAddressDistrict(e.target.value); setAddressSaveStatus(null); }}
                      required
                      disabled={!newAddressCity || isBusy}
                    >
                      <option value="">{newAddressCity ? "Select area" : "Area"}</option>
                      {(BD_AREAS[newAddressCity] || []).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, bottom: "50%", transform: "translateY(50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newAddressLine1.trim() || !newAddressCity || !newAddressDistrict) {
                        setAddressSaveStatus({ type: "err", message: "Please fill in street address, city, and district/area." });
                        return;
                      }
                      setIsBusy(true);
                      setAddressSaveStatus(null);
                      try {
                        const useCheckoutAddressApi = !!checkoutVerificationTicket || trustedDeviceCheckout || !loggedUser?.id;
                        const addressPayload = {
                          label: newAddressLabel.trim() || "Untitled",
                          line1: newAddressLine1.trim(),
                          city: newAddressCity,
                          district: newAddressDistrict,
                          is_default: savedAddresses.length === 0,
                        };
                        const res = await fetch(`${API_BASE}${useCheckoutAddressApi ? "/orders/checkout-address" : "/me/addresses"}`, {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(useCheckoutAddressApi
                            ? { ...addressPayload, phone: normalizedPhone, ...(checkoutVerificationTicket ? { verification_ticket: checkoutVerificationTicket } : {}) }
                            : addressPayload),
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok || !json?.ok) {
                          setAddressSaveStatus({ type: "err", message: json?.error?.message || "Failed to save address. Please sign in again and retry." });
                          return;
                        }
                        if (!json?.data?.id) {
                          setAddressSaveStatus({ type: "err", message: "Address saved response was incomplete. Please refresh and retry." });
                          return;
                        }
                        setSavedAddresses(prev => [...prev, json.data]);
                        setSelectedAddressId(json.data.id);
                        setNewAddressLabel(""); setNewAddressLine1(""); setNewAddressCity(""); setNewAddressDistrict("");
                        setShowAddAddressForm(false);
                        setStreet(json.data.line1);
                        setCity(json.data.city);
                        setArea(json.data.district);
                        setAddressSaveStatus({ type: "ok", message: "Address saved and selected for this order." });
                      } catch (err) {
                        setAddressSaveStatus({ type: "err", message: err.message || "Failed to save address." });
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    disabled={isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict}
                    style={{ flex: 1, padding: "8px 12px", background: "#571F29", color: "#F7E3C9", borderRadius: 6, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, border: "none", cursor: isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict ? "not-allowed" : "pointer", opacity: isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict ? 0.55 : 1 }}
                  >
                    <i className="fa-solid fa-check" aria-hidden="true" style={{ marginRight: 4 }} />
                    Save Address
                  </button>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowAddAddressForm(false); setSelectedAddressId(savedAddresses[0]?.id || ""); }}
                      style={{ flex: 1, padding: "8px 12px", background: "rgba(87,31,41,.1)", color: "#571F29", borderRadius: 6, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {addressSaveStatus && (
                  <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 12, color: addressSaveStatus.type === "ok" ? "#1E9E60" : "#C82828", fontWeight: 600 }}>
                    <i className={`fa-solid ${addressSaveStatus.type === "ok" ? "fa-circle-check" : "fa-circle-xmark"}`} aria-hidden="true" style={{ marginRight: 5 }} />
                    {addressSaveStatus.message}
                  </div>
                )}
              </div>
            )}

            {addressSaveStatus && !showAddAddressForm && (
              <div style={{ marginBottom: 10, fontFamily: "var(--font-body)", fontSize: 12, color: addressSaveStatus.type === "ok" ? "#1E9E60" : "#C82828", fontWeight: 600 }}>
                <i className={`fa-solid ${addressSaveStatus.type === "ok" ? "fa-circle-check" : "fa-circle-xmark"}`} aria-hidden="true" style={{ marginRight: 5 }} />
                {addressSaveStatus.message}
              </div>
            )}

            {/* Manual address entry (for guests or if not using saved addresses) */}
            {(!showAddAddressForm && (!activeUser?.id || selectedAddressId === "")) && (
              <>
                <div className="checkout-address-grid">
                  <div style={{ position: "relative" }}>
                    <select
                      style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: "pointer", color: city ? "#1A0A0D" : "rgba(26,10,13,.38)" }}
                      value={city}
                      onChange={e => { setCity(e.target.value); setArea(""); }}
                      required={!activeUser?.id || selectedAddressId === ""}
                      disabled={isBusy}
                    >
                      <option value="" disabled>City *</option>
                      {Object.keys(BD_AREAS).sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <select
                      style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: city ? "pointer" : "not-allowed", color: area ? "#1A0A0D" : "rgba(26,10,13,.38)", opacity: city ? 1 : 0.55 }}
                      value={area}
                      onChange={e => setArea(e.target.value)}
                      required={!activeUser?.id || selectedAddressId === ""}
                      disabled={!city || isBusy}
                    >
                      <option value="">{city ? "Select area *" : "District/Area *"}</option>
                      {(BD_AREAS[city] || []).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
                  </div>
                </div>

                <input
                  style={field}
                  type="text"
                  placeholder="House no., road, block, building…"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  required={!activeUser?.id || selectedAddressId === ""}
                  disabled={isBusy}
                />
              </>
            )}
          </div>
            </>
          )}

          <button
            type="submit"
            disabled={step === "details" ? !canSubmitDetails : !canSubmitPhone}
            style={primBtn(step === "details" ? !canSubmitDetails : !canSubmitPhone)}
            aria-label={step === "details" ? `${paymentMethod === "bkash" ? "Confirm bKash order" : "Place order"} for ৳${effectiveFinalTotal.toLocaleString()}` : undefined}
          >
            {isBusy
              ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {step === "details" ? "Placing Order…" : "Checking…"}</>
              : step === "details"
                ? <>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M16.5 5.5 8.1 13.9 3.8 9.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {/* PAYMENT — validation */}
                    {paymentMethod === "bkash"
                      ? `Confirm bKash Order — ৳${effectiveFinalTotal.toLocaleString()}`
                      : `Place Order — ৳${effectiveFinalTotal.toLocaleString()}`
                    }
                  </>
                : guestTrustedDevice
                  ? <><i className="fa-solid fa-arrow-right-long" aria-hidden="true" /> Continue</>
                  : phoneChecking
                    ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Checking Number…</>
                    : guestNeedsOtp
                      ? <><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> Send Verification Code</>
                      : <><i className="fa-solid fa-arrow-right-long" aria-hidden="true" /> Continue</>
            }
          </button>
          <p style={{ margin: "0", fontSize: 11.5, color: "#999", fontFamily: "var(--font-body)", textAlign: "center" }}>
            {step === "details"
              ? paymentMethod === "bkash"
                ? "bKash payment · No COD charge · Order confirmed after verification"
                : "Cash on delivery · Delivery and 1% COD charge included"
              : phoneChecking
                ? "Cash on delivery · Checking this phone number"
                : guestNeedsOtp
                  ? "Cash on delivery · A code will be sent to your number"
                  : "Cash on delivery · Enter your phone number to continue"}
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Buy Sheet (mobile) ────────────────────────────────────────────────────────
function BuySheet({ open, onClose, qty, setQty, coupon, setCoupon, couponStatus, setCouponStatus, couponError, discount, verifyCoupon, addToCart, addedAnim, product, onBuyNow, onCreateAccount }) {
  const pricing = calculateProductPricing(product, qty);
  const totalPrice = Math.max(0, pricing.productSubtotal - discount);
  const showOldPrice = pricing.productDiscountTotal > 0 || discount > 0;
  const productDiscounted = hasProductDiscount(product);
  const discountCapMessage = getDiscountCapMessage(product, qty);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="buy-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="buy-sheet">
        <div className="buy-sheet-handle" />

        {/* TASK 1 — BuySheet redesign */}
        <div className="buy-sheet-header">
          <div>
            <div className="buy-sheet-product-name" style={{
              fontSize: 17,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#571F29",
              marginBottom: 4,
            }}>{product.name} -  {product.weight}</div>
            <div className="buy-sheet-price" style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              fontSize: 26,
              fontWeight: 900,
              fontFamily: "var(--font-display)",
              color: "#C97C00",
            }}>
              <span>৳{totalPrice.toLocaleString()}</span>
              {showOldPrice && (
                <span style={{ fontSize: 14, color: "rgba(87,31,41,0.4)", textDecoration: "line-through" }}>
                  ৳{pricing.originalSubtotal.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button className="buy-sheet-close" onClick={onClose} aria-label="Close" style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(87,31,41,0.08)",
            fontSize: 18,
            color: "#571F29",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>×</button>
        </div>

        {discountCapMessage && (
          <div style={{
            background: "rgba(255,145,0,0.08)",
            border: "1px solid rgba(255,145,0,0.28)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}>
            <span style={{
              background: "#FF9100",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "3px 9px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              flexShrink: 0,
              marginTop: 1,
            }}>{product.discountLabel || `৳${pricing.productDiscountTotal.toLocaleString()} OFF`}</span>
            <span style={{
              fontSize: 12.5,
              color: "#7A4800",
              lineHeight: 1.45,
              fontFamily: "var(--font-body)",
            }}>{discountCapMessage}</span>
          </div>
        )}

        {/* coupon -  force row layout even on mobile */}
        {productDiscounted ? (
          <div className="shop-coupon-disabled" style={{
            background: "rgba(87,31,41,0.05)",
            border: "1px solid rgba(87,31,41,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 14,
          }}>
            <i className="fa-solid fa-circle-info" aria-hidden="true" style={{
              color: "rgba(87,31,41,0.4)",
              fontSize: 15,
              flexShrink: 0,
              marginTop: 1,
            }} />
            <span style={{
              fontSize: 12.5,
              color: "rgba(87,31,41,0.65)",
              lineHeight: 1.45,
              fontFamily: "var(--font-body)",
            }}>Enter your phone number first. If this offer is not available for your number, you can apply a coupon at checkout.</span>
          </div>
        ) : (
          <div className="shop-coupon-row">
            <div className="shop-coupon-wrap" style={{ flexDirection: "row", borderRadius: 8 }}>
              <input
                className={"shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : "")}
                type="text"
                placeholder="Enter coupon code"
                value={coupon}
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
                onKeyDown={e => e.key === "Enter" && verifyCoupon()}
                aria-label="Coupon code"
              />
              <button className="shop-coupon-btn" onClick={verifyCoupon} style={{ borderRadius: 0, padding: "0 18px" }}>Verify</button>
            </div>
            {couponStatus === "ok" && (
              <span className="shop-coupon-msg shop-coupon-msg--ok">
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied - ৳{discount} off
              </span>
            )}
            {couponStatus === "err" && (
              <span className="shop-coupon-msg shop-coupon-msg--err">
                <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {couponError}
              </span>
            )}
          </div>
        )}

        {/* qty + proceed */}
        <div className="shop-qty-row" style={{ marginBottom: 14, display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 0 }}>
          <div className="shop-qty" style={{ display: "flex", alignItems: "center", gap: 8, border: "none", borderRadius: 0, overflow: "visible", background: "transparent" }}>
            <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(87,31,41,0.08)",
              color: "#571F29",
              fontSize: 20,
              border: "none",
              cursor: "pointer",
            }}>−</button>
            <span className="shop-qty-val" style={{
              minWidth: 36,
              width: "auto",
              textAlign: "center",
              fontSize: 17,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#571F29",
              lineHeight: 1,
              borderLeft: "none",
              borderRight: "none",
            }}>{qty}</span>
            <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity" style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(87,31,41,0.08)",
              color: "#571F29",
              fontSize: 20,
              border: "none",
              cursor: "pointer",
            }}>+</button>
          </div>
          <button className="shop-add-btn" onClick={onBuyNow} style={{
            flex: 1,
            width: "auto",
            marginLeft: 12,
            height: 48,
            background: "#571F29",
            color: "#F7E3C9",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}><i className="fa-solid fa-bag-shopping" aria-hidden="true" style={{ fontSize: 14 }} />Order Now</button>
        </div>
        <div className="shop-member-note shop-member-note--sheet" style={{
          background: "rgba(255,145,0,0.06)",
          border: "1px solid rgba(255,145,0,0.2)",
          borderRadius: 12,
          padding: "12px 14px",
          display: "block",
          marginTop: 0,
          gap: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
            <i className="fa-solid fa-star" aria-hidden="true" style={{ color: "#FF9100", fontSize: 13, flexShrink: 0, marginTop: 2 }} />
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#571F29",
              fontFamily: "var(--font-display)",
              flex: 1,
              minWidth: 0,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              lineHeight: 1.35,
            }}>Save your address. Track your order. Earn points.</span>
          </div>
          <span style={{
            display: "block",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(87,31,41,0.6)",
            lineHeight: 1.45,
            marginTop: 5,
            flex: "none",
          }}>Create an account and earn points from this order. Save your address, track your pouch, and reorder faster next time.</span>
          <button className="shop-member-note-cta" onClick={() => { onClose(); onCreateAccount?.(); }} style={{
            marginTop: 10,
            width: "100%",
            padding: 10,
            background: "transparent",
            border: "1.5px solid rgba(87,31,41,0.25)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "#571F29",
            cursor: "pointer",
            marginLeft: 0,
            flexBasis: "auto",
            boxSizing: "border-box",
          }}>
            Join the Midnight Circle
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Section ───────────────────────────────────────────────────────────
const REVIEW_TAG_LABELS = {
  taste: "Taste",
  aroma: "Aroma",
  easy_to_make: "Easy to make",
  energy_focus: "Energy / Focus",
  packaging: "Packaging",
  delivery: "Delivery",
};
const REVIEW_AVATAR_COLORS = ["#7B2D38","#B84A1A","#5E3A1E","#2B5C30","#1A4D6E","#6A3D72"];

function reviewAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return REVIEW_AVATAR_COLORS[h % REVIEW_AVATAR_COLORS.length];
}

function ReviewsSection({ productSlug = "midnight-blend", onStats, loggedIn, onSignIn, onOrderNow }) {
  const isMobile = useIsMobile();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [topTags, setTopTags] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [reviewTrigger, setReviewTrigger] = useState(0);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewNotice, setReviewNotice] = useState("");
  const LIMIT = 6;

  const fetchReviews = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reviews?product=${productSlug}&page=${p}&limit=${LIMIT}`);
      const json = await res.json();
      if (!json?.ok) return;
      const nextReviews = json.data?.reviews || [];
      setReviews(prev => p === 1 ? nextReviews : [...prev, ...nextReviews]);
      setTotal(json.data?.total || 0);
      setAvgRating(json.data?.avg_rating || 0);
      setTopTags(json.data?.top_tags || []);
      setPage(p);
      onStats?.({ rating: json.data?.avg_rating || 0, count: json.data?.total || 0 });
    } catch {
      /* reviews are non-critical to checkout */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(1); }, [productSlug]);

  const fmtMonth = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";

  const tagChip = (tag, key, active) => (
    <span key={key} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: active ? "7px 14px" : "4px 11px",
      borderRadius: 999,
      background: active ? "rgba(255,145,0,.1)" : "rgba(87,31,41,.06)",
      border: `1px solid ${active ? "rgba(255,145,0,.45)" : "rgba(87,31,41,.12)"}`,
      fontFamily: "var(--font-body)", fontSize: active ? 12.5 : 11.5, fontWeight: 700,
      color: active ? "#571F29" : "rgba(87,31,41,.65)", whiteSpace: "nowrap",
    }}>
      {REVIEW_TAG_LABELS[tag] || tag}
    </span>
  );

  const hasMore = reviews.length < total;
  const reviewIntentKey = `mp_review_intent_${productSlug}`;

  const openReviewCta = async () => {
    setReviewNotice("");
    if (!loggedIn) {
      localStorage.setItem(reviewIntentKey, "1");
      onSignIn?.();
      return;
    }

    try {
      const q = new URLSearchParams({ prompt: "false", product: productSlug });
      const res = await fetch(`${API_BASE}/reviews/eligibility?${q.toString()}`, {
        credentials: "include",  // Send httpOnly cookie automatically
      });
      const json = await res.json();
      if (json?.data?.eligible) {
        setReviewOrderId(json.data.order_id);
        setReviewTrigger(Date.now());
      } else if (json?.data?.reason === "already_reviewed") {
        setReviewNotice("You’ve already submitted a review.");
      } else {
        setLockedOpen(true);
      }
    } catch {
      setReviewNotice("We could not check your review status. Please try again.");
    }
  };

  useEffect(() => {
    if (!loggedIn || localStorage.getItem(reviewIntentKey) !== "1") return;
    localStorage.removeItem(reviewIntentKey);
    setTimeout(openReviewCta, 500);
  }, [loggedIn, productSlug]);

  const reviewCta = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 7 }}>
      <button
        type="button"
        onClick={openReviewCta}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "11px 20px", minHeight: 44, borderRadius: 14,
          background: "rgba(255,145,0,.12)", border: "1.5px solid rgba(255,145,0,.58)",
          color: "#571F29", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14,
          cursor: "pointer", boxShadow: "0 8px 22px rgba(87,31,41,.08)",
          transition: "transform .15s, box-shadow .15s, background .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 26px rgba(255,145,0,.18)"; e.currentTarget.style.background = "rgba(255,145,0,.18)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(87,31,41,.08)"; e.currentTarget.style.background = "rgba(255,145,0,.12)"; }}
      >
        <i className="fa-solid fa-pen-nib" aria-hidden="true" />
        Write a Review
      </button>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(87,31,41,.52)", maxWidth: 300, lineHeight: 1.45, textAlign: isMobile ? "left" : "right" }}>
        Order first, then share your experience as a verified customer.
      </span>
    </div>
  );

  return (
    <section id="reviews-section" style={{ borderTop: "1px solid rgba(87,31,41,.1)", marginTop: 36 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 48, lineHeight: 1, color: "#571F29" }}>{avgRating > 0 ? avgRating : "–"}</div>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 4 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={14} filled={i <= Math.round(avgRating)} />)}
              </div>
            </div>
            <div style={{ width: 1, height: 52, background: "rgba(87,31,41,.15)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#571F29", marginBottom: 2 }}>Customer Reviews</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.55)" }}>
                Based on {total.toLocaleString()} verified purchase{total === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          {!isMobile && reviewCta}
        </div>

        {topTags.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: "rgba(87,31,41,.45)" }}>
              Most mentioned
            </span>
            {topTags.map(t => tagChip(t.tag, t.tag, true))}
          </div>
        )}
        {isMobile && (
          <div style={{ marginBottom: 22 }}>
            {reviewCta}
          </div>
        )}
        {reviewNotice && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22,
            padding: "10px 14px", borderRadius: 12,
            background: "rgba(76,175,132,.1)", border: "1px solid rgba(76,175,132,.22)",
            color: "#2E7D4F", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700,
          }}>
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            {reviewNotice}
          </div>
        )}

        {loading && reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(87,31,41,.4)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} aria-hidden="true" />Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <i className="fa-regular fa-comment-dots" style={{ fontSize: 32, color: "rgba(87,31,41,.2)", display: "block", marginBottom: 12 }} aria-hidden="true" />
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "rgba(87,31,41,.5)", margin: "0 0 4px" }}>No reviews yet</p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.4)", margin: 0 }}>Reviews open once members receive their coffee.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: "rgba(255,255,255,.55)", backdropFilter: "blur(6px)", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(87,31,41,.1)", boxShadow: "0 2px 12px rgba(87,31,41,.05)", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} filled={i <= r.rating} />)}
                    </div>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(87,31,41,.4)", whiteSpace: "nowrap" }}>{fmtMonth(r.created_at)}</span>
                  </div>

                  {r.comment && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "rgba(44,24,16,.82)", margin: "0 0 12px", lineHeight: 1.65 }}>
                      “{r.comment}”
                    </p>
                  )}

                  {r.highlight_tags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {r.highlight_tags.map((t, i) => tagChip(t, i, false))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: reviewAvatarColor(r.display_name || "M"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {(r.display_name || "M").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13.5, color: "#571F29" }}>{r.display_name || "Verified Customer"}</div>
                      {r.is_verified && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "#2E7D4F" }}>
                          <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} aria-hidden="true" />
                          Verified Purchase
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => fetchReviews(page + 1)} disabled={loading}
                  style={{ padding: "11px 32px", background: "none", color: "#571F29", borderRadius: 10, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: "1.5px solid rgba(87,31,41,.22)", cursor: "pointer" }}>
                  {loading ? "Loading…" : `Load more · ${total - reviews.length} remaining`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {lockedOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1320, background: "rgba(33,16,13,.48)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setLockedOpen(false)}
          role="dialog" aria-modal="true" aria-label="Unlock verified reviews"
        >
          <div style={{
            width: "100%", maxWidth: 430, borderRadius: 24, background: "#FFFDF7",
            border: "1px solid rgba(87,31,41,.12)", boxShadow: "0 28px 80px rgba(58,31,26,.32)",
            padding: "28px 26px 24px", position: "relative", textAlign: "left",
          }}>
            <button type="button" onClick={() => setLockedOpen(false)} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, border: "none", borderRadius: 10, background: "rgba(44,24,16,.06)", color: "#2C1810", cursor: "pointer" }}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,145,0,.14)", color: "#FF9100", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <i className="fa-solid fa-lock-open" aria-hidden="true" />
            </div>
            <p style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#FF9100" }}>
              Verified reviews unlock after your first order
            </p>
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "#571F29", lineHeight: 1.15 }}>Unlock verified reviews</h3>
            <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(44,24,16,.65)", lineHeight: 1.6 }}>
              Place your first order to share your experience as a verified customer.
            </p>
            <button
              type="button"
              onClick={() => { setLockedOpen(false); onOrderNow?.(); }}
              style={{ width: "100%", minHeight: 48, border: "none", borderRadius: 14, background: "#FF9100", color: "#2C1810", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 24px rgba(255,145,0,.28)" }}
            >
              Order Now
            </button>
            <p style={{ margin: "12px 0 0", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(44,24,16,.48)", lineHeight: 1.5 }}>
              Your review will appear after delivery and approval.
            </p>
          </div>
        </div>
      )}
      {typeof MPReviewPrompt === "function" && (
        <MPReviewPrompt source="shop_review_cta" manual triggerKey={reviewTrigger} orderId={reviewOrderId} productSlug={productSlug} />
      )}
    </section>
  );
}

// ── Shop Page ─────────────────────────────────────────────────────────────────
function ShopPage() {
  const [product, setProduct] = useState(PRODUCT_DEFAULT);
  const [productLoading, setProductLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [imgKey, setImgKey] = useState(0);
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState("idle");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("mp_cart") || "[]"); } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [addedAnim, setAddedAnim] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [reviewAuthIntent, setReviewAuthIntent] = useState(false);
  const [shopAuth, setShopAuth] = useState(getShopAuthState);

  const handleLogout = async () => {
    try {
      // Call backend logout to revoke tokens and clear cookies
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    // Clear local user info
    localStorage.removeItem("mp_user");
    setShopAuth({ loggedIn: false, dashUrl: "dashboard-user.html", user: null });
  };
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [reviewStats, setReviewStats] = useState({ rating: 0, count: 0 });
  const [couponOpen, setCouponOpen] = useState(false);

  // Fetch product from API -  use ?id= query param or first active product
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');
    const url = pid ? `${API_BASE}/products/${pid}` : `${API_BASE}/products`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!data || !data.ok) return;
        const p = pid ? data.data : (data.data && data.data.products && data.data.products[0]);
        if (!p) return;
        const statusLower = (p.status || "active").toLowerCase();
        setProduct({
          id:       p.id,
          name:     p.name || "",
          price:    Math.round(Number(p.sale_price || p.price || 0)),
          originalPrice: Math.round(Number(p.price || 0)),
          salePrice: Math.round(Number(p.sale_price || p.price || 0)),
          discountAmount: Math.round(Number(p.discount_amount || 0)),
          discountMaxQty: p.discount_max_qty || null,
          discountMaxOrders: p.discount_max_orders || null,
          discountBlocked: !!p.discount_blocked,
          discountLabel: p.discount_label || "",
          desc:     p.description || "",
          weight:   p.qty ? `${p.qty}${p.unit || 'g'}` : "",
          category: p.category || "",
          badge:    p.badge || p.category || "",
          status:   statusLower,
          inStock:  statusLower !== "coming soon" && statusLower !== "stock out" &&
                    (p.stock === null || p.stock === undefined || p.stock > 0),
          roast:    p.roast || "",
          origin:   p.origin || "",
          blend:    p.blend || "",
          process:  p.process || "",
          images:   Array.isArray(p.images) ? p.images : [],
        });
        setActiveImg(0);
      })
      .catch(() => {})
      .finally(() => setProductLoading(false));
  }, []);

  useEffect(() => { sessionStorage.setItem("mp_cart", JSON.stringify(cart)); }, [cart]);

  const pricing = calculateProductPricing(product, qty);
  const productDiscounted = hasProductDiscount(product);
  const discountCapMessage = getDiscountCapMessage(product, qty);
  const totalPrice = Math.max(0, pricing.productSubtotal - discount);

  useEffect(() => {
    if (!productDiscounted) return;
    setCoupon("");
    setCouponStatus("idle");
    setCouponError("");
    setDiscount(0);
    setCouponOpen(false);
  }, [productDiscounted, product.id]);

  const switchImage = (idx) => {
    setActiveImg(idx);
    setImgKey(k => k + 1);
  };

  const verifyCoupon = async () => {
    if (!coupon.trim()) return;
    if (productDiscounted) {
      setDiscount(0);
      setCouponStatus("err");
      setCouponError("Coupon codes cannot be used on discounted products.");
      return;
    }
    setCouponStatus("loading");
    setCouponError("");
    try {
      const subtotal = pricing.productSubtotal;
      const res  = await fetch(
        `${API_BASE}/coupons/verify?code=${encodeURIComponent(coupon.trim())}&subtotal=${subtotal}${product.id && !product.discountBlocked ? `&product_id=${encodeURIComponent(product.id)}` : ""}`,
        { credentials: "include" }  // send auth cookie so specific coupons can check login
      );
      const json = await res.json();
      if (!res.ok) {
        setDiscount(0);
        // For login-required coupons, prompt the user to sign in
        if (json?.error?.code === 'COUPON_LOGIN_REQUIRED') {
          setCouponError("This coupon is for registered customers only. Please sign in to use it.");
          setCouponStatus("err");
          return;
        }
        setCouponError(json?.error?.message || "Invalid coupon code.");
        setCouponStatus("err");
        return;
      }
      setDiscount(json.data.discount);
      setCouponStatus("ok");
      window.mpDismissBannerForCoupon?.(coupon.trim());
    } catch {
      setDiscount(0);
      setCouponError("Could not verify coupon. Please try again.");
      setCouponStatus("err");
    }
  };

  const addToCart = () => {
    const item = { id: product.id || "blend", name: product.name, price: totalPrice / qty, qty };
    setCart(c => [...c, item]);
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, name: `${product.name}${product.weight ? ' -  ' + product.weight : ''}` }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2200);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };

  const openOrderModal = () => {
    setBuySheetOpen(false);
    setOrderModalOpen(true);
  };

  const buyNow = () => {
    if (product.status === "coming soon" || product.status === "stock out") return;
    if (window.innerWidth <= 640) {
      setBuySheetOpen(true);
    } else {
      setOrderModalOpen(true);
    }
  };

  if (productLoading) {
    return (
      <div className="shop-page">
        <ShopHeader onSignIn={() => { setReviewAuthIntent(false); setAuthOpen(true); }} loggedIn={shopAuth.loggedIn} dashUrl={shopAuth.dashUrl} onLogout={handleLogout} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
          <div className="loader" aria-label="Loading product" role="status">
            <div className="cup">
              <div className="cup-handle" />
              <div className="smoke one" />
              <div className="smoke two" />
              <div className="smoke three" />
            </div>
            <div className="load">Loading product…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <ShopHeader onSignIn={() => { setReviewAuthIntent(false); setAuthOpen(true); }} productName={product.name} loggedIn={shopAuth.loggedIn} dashUrl={shopAuth.dashUrl} onLogout={handleLogout} />

      <div className="shop-layout">

        {/* LEFT: image */}
        <div className="shop-visual">
          <div className="shop-img-card">
            <div className="shop-img-wrapper">
              {product.images.length > 0 ? (
                <img
                  key={imgKey}
                  src={product.images[activeImg]}
                  alt={`${product.name} -  image ${activeImg + 1}`}
                  className="shop-main-img"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: 280, color: "rgba(87,31,41,.2)" }}>
                  <i className="fa-solid fa-image" style={{ fontSize: 56 }} aria-hidden="true" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="shop-thumbs">
                {product.images.map((src, i) => (
                  <button
                    key={i}
                    className={"shop-thumb" + (activeImg === i ? " active" : "")}
                    onClick={() => switchImage(i)}
                    aria-label={`View ${THUMB_LABELS[i] ?? `image ${i + 1}`}`}
                  >
                    <LazyImage src={src} alt={THUMB_LABELS[i] ?? `Image ${i + 1}`} style={{ width: '100%', height: '100%' }} />
                    <span className="shop-thumb-label">{THUMB_LABELS[i] ?? String(i + 1)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: product info */}
        <div className="shop-info">
          {product.category && <div className="shop-category">{product.category}</div>}

          <div className="shop-name-row">
            <h1 className="shop-name">{product.name}</h1>
            {product.status === "coming soon"
              ? <span className="shop-stock-badge" style={{ background: "rgba(255,145,0,.15)", color: "#b36200", border: "1px solid rgba(255,145,0,.35)" }}>Coming Soon</span>
              : product.status === "stock out"
              ? <span className="shop-stock-badge" style={{ background: "rgba(200,40,40,.1)", color: "#c82828", border: "1px solid rgba(200,40,40,.25)" }}>Out of Stock</span>
              : product.inStock
              ? <span className="shop-stock-badge">In Stock</span>
              : null
            }
          </div>

          {reviewStats.rating > 0 && <ShopStarRating rating={reviewStats.rating} reviews={reviewStats.count} />}

          <div className="shop-price-row">
            <span className="shop-price">৳{totalPrice.toLocaleString()}</span>
            {(pricing.productDiscountTotal > 0 || discount > 0) && (
              <>
                <span className="shop-old-price">৳{pricing.originalSubtotal.toLocaleString()}</span>
                {pricing.productDiscountTotal > 0 && <span className="shop-save-badge">{product.discountLabel || `Save ৳${pricing.productDiscountTotal.toLocaleString()}`}</span>}
                {discount > 0 && <span className="shop-save-badge shop-save-badge--coupon">Coupon Applied</span>}
              </>
            )}
          </div>
          {pricing.productDiscountTotal > 0 && discountCapMessage && (
            <div className="shop-product-offer-note" style={{ color: qty > Number(product.discountMaxQty || 0) ? "#B36A00" : undefined }}>
              {getDiscountCapMessage(product, qty)}
            </div>
          )}

          <p className="shop-desc">{product.desc}</p>

          {/* specs -  only render rows that have data */}
          {(product.roast || product.origin || product.blend || product.process || product.weight) && (
            <div className="shop-specs">
              {product.roast   && <div className="shop-spec"><span>Roast</span><strong>{product.roast}</strong></div>}
              {product.origin  && <div className="shop-spec"><span>Origin</span><strong>{product.origin}</strong></div>}
              {product.blend   && <div className="shop-spec"><span>Blend</span><strong>{product.blend}</strong></div>}
              {product.process && <div className="shop-spec"><span>Process</span><strong>{product.process}</strong></div>}
              {product.weight  && <div className="shop-spec shop-spec--full"><span>Weight</span><strong>{product.weight}</strong></div>}
            </div>
          )}

          {/* qty + Order Now row — hidden on mobile (lives in buy sheet / sticky CTA) */}
          <div className="shop-inline-controls">
            <p className="shop-qty-label">Quantity</p>
            <div className="shop-qty-row">
              <div className="shop-qty">
                <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span className="shop-qty-val">{qty}</span>
                <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
              </div>
              {product.status === "coming soon" || product.status === "stock out" ? (
                <button className="shop-buy-btn" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>
                  {product.status === "coming soon" ? "Coming Soon" : "Out of Stock"}
                </button>
              ) : (
                <button className="shop-buy-btn" onClick={buyNow}>
                  <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                  Order Now
                </button>
              )}
            </div>
            <div className="shop-member-note">
              <i className="fa-solid fa-star" aria-hidden="true" />
              <span>Create an account and earn points from this order. Save your address, track your pouch, and reorder faster next time.</span>
            </div>
          </div>

          {/* Trust row — hidden on mobile */}
          <div className="shop-trust-row">
            <span className="shop-trust-chip"><i className="fa-solid fa-motorcycle" aria-hidden="true" /> Cash on Delivery</span>
            <span className="shop-trust-chip"><i className="fa-solid fa-truck-fast" aria-hidden="true" /> 1–2 Day Delivery</span>
            <span className="shop-trust-chip"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Sealed Pack</span>
          </div>

          {productDiscounted ? (
            <div className="shop-coupon-disabled">
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
              Enter your phone number first. If this offer is not available for your number, you can apply a coupon at checkout.
            </div>
          ) : (
            <>
              {/* Collapsible coupon — hidden on mobile */}
              <button
                className="shop-coupon-toggle"
                onClick={() => setCouponOpen(c => !c)}
                aria-expanded={couponOpen}
              >
                <i className="fa-solid fa-tag" aria-hidden="true" />
                Have a coupon?
                <i className={`fa-solid fa-chevron-${couponOpen ? "up" : "down"}`} aria-hidden="true" />
              </button>
              {couponOpen && (
                <div className="shop-coupon-row">
                  <div className="shop-coupon-wrap">
                    <input
                      className={"shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : "")}
                      type="text"
                      placeholder="Enter coupon code"
                      value={coupon}
                      onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
                      onKeyDown={e => e.key === "Enter" && verifyCoupon()}
                      aria-label="Coupon code"
                    />
                    <button className="shop-coupon-btn" onClick={verifyCoupon} disabled={couponStatus === "loading"}>
                      {couponStatus === "loading" ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : "Apply"}
                    </button>
                  </div>
                  {couponStatus === "ok" && (
                    <span className="shop-coupon-msg shop-coupon-msg--ok">
                      <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied — ৳{discount} off
                    </span>
                  )}
                  {couponStatus === "err" && (
                    <span className="shop-coupon-msg shop-coupon-msg--err">
                      <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {couponError}
                    </span>
                  )}
                </div>
              )}
            </>
          )}

        </div>

      </div>

      <ReviewsSection
        productSlug="midnight-blend"
        onStats={setReviewStats}
        loggedIn={shopAuth.loggedIn}
        onSignIn={() => { setReviewAuthIntent(true); setAuthOpen(true); }}
        onOrderNow={buyNow}
      />

      {/* Sticky mobile CTA */}
      <div className="shop-sticky-cta">
        <div className="shop-sticky-cta-left">
          <span className="shop-sticky-price">৳{totalPrice.toLocaleString()}</span>
          {(pricing.productDiscountTotal > 0 || discount > 0) && (
            <span className="shop-sticky-old">৳{pricing.originalSubtotal.toLocaleString()}</span>
          )}
        </div>
        <button
          className="shop-sticky-cta-btn"
          onClick={buyNow}
          disabled={product.status === "coming soon" || product.status === "stock out"}
        >
          {product.status === "coming soon" ? "Coming Soon" : product.status === "stock out" ? "Out of Stock" : "Order Now"}
        </button>
      </div>

      <ShopToastStack toasts={toasts} />
      {typeof MPReviewPrompt === "function" && <MPReviewPrompt source="site_revisit" suppress={orderModalOpen || buySheetOpen || authOpen} productSlug="midnight-blend" />}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Join the Midnight Circle"
        subtitle={reviewAuthIntent
          ? "Create your account to order, collect Midnight Points, and share a verified review later."
          : "Track orders, collect Midnight Points, reorder faster, and manage your monthly coffee plan."}
        postAuthRedirect={reviewAuthIntent ? `${window.location.href.split("#")[0]}#reviews-section` : null}
      />
      <BuySheet
        open={buySheetOpen}
        onClose={() => setBuySheetOpen(false)}
        qty={qty}
        setQty={setQty}
        coupon={coupon}
        setCoupon={setCoupon}
        couponStatus={couponStatus}
        setCouponStatus={setCouponStatus}
        couponError={couponError}
        discount={discount}
        verifyCoupon={verifyCoupon}
        addToCart={addToCart}
        addedAnim={addedAnim}
        product={product}
        onBuyNow={openOrderModal}
        onCreateAccount={() => setAuthOpen(true)}
      />
      <OrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        product={product}
        qty={qty}
        discount={discount}
        setDiscount={setDiscount}
        coupon={coupon}
        setCoupon={setCoupon}
        couponStatus={couponStatus}
        setCouponStatus={setCouponStatus}
        couponError={couponError}
        setCouponError={setCouponError}
        loggedUser={shopAuth.user}
        onCreateAccount={() => setAuthOpen(true)}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShopPage />);
