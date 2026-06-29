/* Built from shop-app.jsx. Run: node scripts/build-jsx.js */
var {
  useState,
  useEffect,
  useRef
} = React;
function useIsMobile(bp = 640) {
  var [mobile, setMobile] = useState(() => window.matchMedia(`(max-width: ${bp}px)`).matches);
  useEffect(() => {
    var mq = window.matchMedia(`(max-width: ${bp}px)`);
    var onChange = e => setMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);else mq.removeListener(onChange);
    };
  }, [bp]);
  return mobile;
}
var PRODUCT_DEFAULT = {
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
  images: []
};
function getMidnightApiBase() {
  if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, "");
  var {
    protocol,
    hostname,
    port
  } = window.location;
  var base = !port || port === "80" || port === "443" ? `${protocol}//${hostname}/api/v1` : `${protocol}//${hostname}:3000/api/v1`;
  window.MIDNIGHT_API_BASE = base;
  return base;
}
var API_BASE = getMidnightApiBase();
var THUMB_LABELS = ["Front", "Back"];
var BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;
var BKASH_TXN_ID_PATTERN = /^[A-Z0-9]{10}$/;
var BKASH_TXN_ID_PATTERN_MESSAGE = "bKash transaction ID must be exactly 10 letters or numbers.";
var BKASH_MERCHANT_NUMBER = "01XXXXXXXXX";
var BKASH_QR_IMAGE_PATH = "/bkash-qr.png";
var mpSheetStyleInjected = false;
function injectMpSheetStyle() {
  if (mpSheetStyleInjected) return;
  var s = document.createElement("style");
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
  var originalPrice = Math.round(Number(product.originalPrice || product.price || 0));
  var salePrice = Math.round(Number(product.salePrice || product.price || 0));
  var discountPerUnit = Math.max(0, originalPrice - salePrice);
  var discountedQty = discountPerUnit > 0 ? product.discountMaxQty ? Math.min(qty, Number(product.discountMaxQty)) : qty : 0;
  var originalSubtotal = originalPrice * qty;
  var productDiscountTotal = discountPerUnit * discountedQty;
  return {
    originalPrice,
    salePrice,
    originalSubtotal,
    productSubtotal: originalSubtotal - productDiscountTotal,
    productDiscountTotal,
    discountedQty
  };
}
var DELIVERY_DHAKA_THANAS = new Set(["adabor", "badda", "banani", "bangshal", "bhashantek", "bimanbandar", "cantonment", "chalkbazar", "chawkbazar", "dakshinkhan", "dakshin khan", "darus-salam", "darus salam", "demra", "dhanmondi", "gandaria", "gulshan", "hazaribag", "hazaribagh", "jatrabari", "kafrul", "kalabagan", "kamrangirchar", "kadamtoli", "kadamtali", "khilgaon", "khilkhet", "kotwali", "lalbagh", "mirpur", "mirpur model", "mohammadpur", "motijheel", "mugda", "new market", "pallabi", "paltan", "ramna", "rampura", "rupnagar", "sabujbag", "sabujbagh", "shah ali", "shahbagh", "shahjahanpur", "sher-e-bangla nagar", "shyampur", "sutrapur", "tejgaon", "tejgaon industrial area", "turag", "uttara east", "uttara west", "uttarkhan", "uttar khan", "vatara", "wari", "dhaka"]);
var DELIVERY_SUBURBAN_AREAS = new Set(["savar", "ashulia", "keraniganj", "narayanganj", "narayanganj sadar", "fatullah", "siddhirganj", "rupganj", "sonargaon", "gazipur", "gazipur sadar", "tongi", "kaliakair", "kaliganj", "kapasia", "sreepur", "dhamrai", "dohar", "nawabganj"]);
function parseWeightGrams(weight) {
  var match = String(weight || "").match(/(\d+(?:\.\d+)?)/);
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
    for (var area of areas) {
      if (part.startsWith(`${area} `) || part.endsWith(` ${area}`)) return true;
    }
    return false;
  });
}
function calculateShippingCost(location, weightGrams) {
  var parts = collectDeliveryLocationParts(location);
  var suburban = matchesDeliveryArea(parts, DELIVERY_SUBURBAN_AREAS);
  var insideDhaka = !suburban && parts.some(part => DELIVERY_DHAKA_THANAS.has(part) || part === "dhaka" || part === "dhaka city");
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
  var locationParts = collectDeliveryLocationParts(location);
  if (!locationParts.length) return {
    shippingCost: 0,
    codFee: 0,
    totalDeliveryCharge: 0,
    finalTotal: productPayable
  };
  var weightGrams = parseWeightGrams(product?.weight) * qty;
  var shippingCost = calculateShippingCost(location, weightGrams);
  var codFee = Math.round(Math.max(0, Number(productPayable || 0)) * 0.01);
  var totalDeliveryCharge = shippingCost + codFee;
  return {
    shippingCost,
    codFee,
    totalDeliveryCharge,
    finalTotal: productPayable + totalDeliveryCharge
  };
}
function getDiscountCapMessage(product, qty) {
  var cap = Number(product?.discountMaxQty || 0);
  var orderCap = Number(product?.discountMaxOrders || 0);
  var messages = [];
  if (product?.discountBlocked) {
    messages.push("This offer is no longer available for this phone number. Regular price applies.");
    return messages.join(" ");
  }
  if (cap) {
    var unit = cap === 1 ? "unit" : "units";
    messages.push(qty > cap ? `Only the first ${cap} ${unit} get the offer. Extra quantity is full price.` : `Offer applies to first ${cap} ${unit} per order.`);
  }
  if (orderCap) {
    var orderWord = orderCap === 1 ? "order" : "orders";
    messages.push(`Offer applies to first ${orderCap} ${orderWord} per phone number.`);
  }
  return messages.join(" ");
}
function OfferExpiredAlert({
  productName,
  price,
  isOfferExpired,
  currencySymbol = "৳",
  animationKey = ""
}) {
  var alertRef = useRef(null);
  var formattedPrice = `${currencySymbol}${Number(price || 0).toLocaleString()}`;
  useEffect(() => {
    if (!isOfferExpired || !alertRef.current) return;
    var el = alertRef.current;
    el.classList.remove("shake-active");
    void el.offsetWidth;
    el.classList.add("shake-active");
  }, [isOfferExpired, animationKey, productName, price]);
  if (!isOfferExpired) {
    return React.createElement("div", {
      className: "offer-expired-plain-row"
    }, React.createElement("span", {
      className: "offer-expired-product-name"
    }, productName), React.createElement("span", {
      className: "offer-expired-price"
    }, formattedPrice));
  }
  return React.createElement("div", {
    ref: alertRef,
    className: "offer-expired-wrapper"
  }, React.createElement("div", {
    className: "offer-expired-product-row"
  }, React.createElement("span", {
    className: "offer-expired-product-name"
  }, productName), React.createElement("span", {
    className: "offer-expired-price"
  }, formattedPrice)), React.createElement("div", {
    className: "offer-expired-banner",
    role: "alert",
    "aria-live": "assertive"
  }, React.createElement("span", {
    className: "offer-expired-icon",
    "aria-hidden": "true"
  }, React.createElement("svg", {
    className: "offer-expired-icon-svg",
    viewBox: "0 0 24 24",
    focusable: "false"
  }, React.createElement("path", {
    d: "M12 3.75 2.85 19.5h18.3L12 3.75Z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M12 8.25v5.25M12 17.25h.01",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }))), React.createElement("span", {
    className: "offer-expired-message"
  }, "This offer is no longer available for this phone number. Regular price applies.")));
}
function hasProductDiscount(product) {
  return Number(product?.discountAmount || 0) > 0 || Number(product?.originalPrice || 0) > Number(product?.salePrice || product?.price || 0);
}
function checkoutApiErrorMessage(error, fallback) {
  if (error?.retry_after_seconds) {
    var minutes = Math.max(1, Math.ceil(error.retry_after_seconds / 60));
    return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return error?.message || fallback;
}
function normalizeBdMobile(raw) {
  var digits = String(raw || "").replace(/\D/g, "");
  if (/^008801[3-9]\d{8}$/.test(digits)) return digits.slice(4);
  if (/^8801[3-9]\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}
function isValidBdMobile(raw) {
  return BD_MOBILE_PATTERN.test(normalizeBdMobile(raw));
}
var BD_AREAS = {
  "Dhaka City": ["Adabor", "Airport", "Badda", "Banani", "Bangshal", "Bhashantek", "Cantonment", "Chawkbazar", "Dakshin Khan", "Darus Salam", "Demra", "Dhanmondi", "Gandaria", "Gulshan", "Hatirjheel", "Hazaribagh", "Jatrabari", "Kadamtali", "Kafrul", "Kalabagan", "Kamrangirchar", "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur Model", "Mohammadpur", "Motijheel", "Mugda", "New Market", "Pallabi", "Paltan", "Ramna", "Rampura", "Rupnagar", "Sabujbagh", "Shah Ali", "Shahbagh", "Shahjahanpur", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon", "Tejgaon Industrial Area", "Turag", "Uttar Khan", "Uttara East", "Uttara West", "Vatara", "Wari"],
  "Dhaka": ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"],
  "Chattogram City": ["Akbar Shah", "Bayazid Bostami", "Bakalia", "Bandar", "Chandgaon", "Chawkbazar", "Double Mooring", "EPZ", "Halishahar", "Karnaphuli", "Kotwali", "Khulshi", "Pahartali", "Panchlaish", "Patenga", "Sadarghat"],
  "Chattogram": ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda", "Karnaphuli"],
  "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
  "Bandarban": ["Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
  "Barguna": ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"],
  "Barishal": ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
  "Bhola": ["Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
  "Bogura": ["Adamdighi", "Bogura Sadar", "Dhunat", "Dupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shahjahanpur", "Sherpur", "Shibganj", "Sonatala"],
  "Brahmanbaria": ["Akhaura", "Ashuganj", "Bancharampur", "Bijoynagar", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
  "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Hajiganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
  "Chapainawabganj": ["Bholahat", "Chapainawabganj Sadar", "Gomastapur", "Nachole", "Shibganj"],
  "Chuadanga": ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
  "Cox's Bazar": ["Chakaria", "Cox's Bazar Sadar", "Eidgaon", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhiya"],
  "Cumilla": ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Cumilla Adarsha Sadar", "Cumilla Sadar Dakshin", "Daudkandi", "Debidwar", "Homna", "Laksam", "Lalmai", "Meghna", "Monoharganj", "Muradnagar", "Nangalkot", "Titas"],
  "Dinajpur": ["Birampur", "Birganj", "Birol", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
  "Faridpur": ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
  "Feni": ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
  "Gaibandha": ["Fulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Bason", "Gacha", "Kashimpur", "Konabari", "Pubail", "Tongi East", "Tongi West"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Habiganj": ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"],
  "Jamalpur": ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"],
  "Jashore": ["Abhaynagar", "Bagherpara", "Chaugachha", "Jashore Sadar", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
  "Jhalakathi": ["Jhalakathi Sadar", "Kathalia", "Nalchity", "Rajapur"],
  "Jhenaidah": ["Harinakundu", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
  "Joypurhat": ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
  "Khagrachhari": ["Dighinala", "Guimara", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
  "Khulna": ["Batiaghata", "Dacope", "Dighalia", "Dumuria", "Koyra", "Paikgacha", "Phultala", "Rupsa", "Terokhada", "Khulna Sadar", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Lobonchara"],
  "Kishoreganj": ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
  "Kurigram": ["Bhurungamari", "Char Rajibpur", "Chilmari", "Fulbari", "Kurigram Sadar", "Nageshwari", "Rajarhat", "Roumari", "Ulipur"],
  "Kushtia": ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
  "Lakshmipur": ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
  "Lalmonirhat": ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
  "Madaripur": ["Dasar", "Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Manikganj": ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair"],
  "Meherpur": ["Gangni", "Meherpur Sadar", "Mujibnagar"],
  "Moulvibazar": ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
  "Munshiganj": ["Gazaria", "Louhajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"],
  "Mymensingh": ["Bhaluka", "Dhobaura", "Fulbaria", "Gafargaon", "Gouripur", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Muktagacha", "Nandail", "Phulpur", "Tarakanda", "Trishal"],
  "Naogaon": ["Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadebpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
  "Narail": ["Kalia", "Lohagara", "Narail Sadar"],
  "Narayanganj": ["Araihazar", "Bandar", "Fatullah", "Narayanganj Sadar", "Rupganj", "Siddhirganj", "Sonargaon"],
  "Narsingdi": ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
  "Natore": ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Naldanga", "Natore Sadar", "Singra"],
  "Netrokona": ["Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"],
  "Nilphamari": ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"],
  "Noakhali": ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar"],
  "Pabna": ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"],
  "Panchagarh": ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
  "Patuakhali": ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"],
  "Pirojpur": ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Pirojpur Sadar", "Zianagar"],
  "Rajbari": ["Baliakandi", "Goalanda", "Kalukhali", "Pangsha", "Rajbari Sadar"],
  "Rajshahi": ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore", "Boalia", "Motihar", "Rajpara", "Shah Makhdum"],
  "Rangamati": ["Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"],
  "Rangpur": ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"],
  "Satkhira": ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"],
  "Shariatpur": ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"],
  "Sherpur": ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"],
  "Sirajganj": ["Belkuchi", "Chauhali", "Kamarkhand", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"],
  "Sunamganj": ["Bishwamvarpur", "Chhatak", "Derai", "Dharmapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Madhyanagar", "Shalla", "Shantiganj", "Sunamganj Sadar", "Tahirpur"],
  "Sylhet": ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshin Surma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj", "Kotwali", "Jalalabad", "Airport", "Moglabazar", "Shah Poran"],
  "Tangail": ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"],
  "Thakurgaon": ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"]
};
var ROLE_DASH = {
  user: "dashboard-user.html",
  crew: "dashboard-user.html",
  influencer: "dashboard-influencer.html",
  admin: "dashboard-admin.html"
};
function getShopAuthState() {
  try {
    var u = JSON.parse(localStorage.getItem("mp_user") || "{}");
    return {
      loggedIn: !!u?.id,
      dashUrl: ROLE_DASH[u.role] || "dashboard-user.html",
      user: u
    };
  } catch {
    return {
      loggedIn: false,
      dashUrl: "dashboard-user.html",
      user: null
    };
  }
}
function ShopHeader({
  onSignIn,
  productName,
  loggedIn,
  dashUrl,
  onLogout
}) {
  var [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    var onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return React.createElement(React.Fragment, null, React.createElement(SiteBannerManager, {
    floating: true
  }), React.createElement("header", {
    className: "shop-header"
  }, React.createElement("a", {
    href: "index.html",
    className: "shop-header-back",
    "aria-label": "Back to home"
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-left",
    "aria-hidden": "true"
  }), React.createElement("span", null, "Home"), productName && React.createElement(React.Fragment, null, React.createElement("span", {
    className: "shop-breadcrumb-sep"
  }, "/"), React.createElement("span", {
    className: "shop-breadcrumb-current"
  }, productName))), React.createElement("div", {
    className: "shop-header-actions"
  }, loggedIn ? React.createElement(React.Fragment, null, React.createElement("a", {
    href: dashUrl,
    className: "nav-signin-btn"
  }, React.createElement("i", {
    className: "fa-solid fa-gauge",
    "aria-hidden": "true"
  }), "Dashboard"), React.createElement("button", {
    className: "nav-signin-btn",
    onClick: onLogout
  }, React.createElement("i", {
    className: "fa-solid fa-right-from-bracket",
    "aria-hidden": "true"
  }), "Log Out")) : React.createElement("button", {
    className: "nav-signin-btn",
    onClick: onSignIn
  }, React.createElement("i", {
    className: "fa-solid fa-right-to-bracket",
    "aria-hidden": "true"
  }), "Sign In"))));
}
function ShopStarRating({
  rating,
  reviews
}) {
  var scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  return React.createElement("button", {
    className: "shop-rating",
    onClick: scrollToReviews,
    "aria-label": "Read customer reviews",
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      display: "flex",
      alignItems: "center"
    }
  }, [1, 2, 3, 4, 5].map(i => React.createElement(Star, {
    key: i,
    size: 14,
    filled: i <= Math.round(rating)
  })), React.createElement("span", {
    className: "shop-rating-num"
  }, rating), React.createElement("span", {
    className: "shop-rating-reviews",
    style: {
      textDecoration: "underline",
      textUnderlineOffset: 2
    }
  }, "(", reviews, " reviews)"));
}
function ShopToastStack({
  toasts
}) {
  return React.createElement("div", {
    className: "toast-stack"
  }, toasts.map(t => React.createElement("div", {
    className: "toast",
    key: t.id
  }, React.createElement("span", {
    className: "dot"
  }), React.createElement("span", null, "Added ", React.createElement("strong", null, t.name), " to cart"))));
}
function OrderModal({
  open,
  onClose,
  product,
  qty,
  discount,
  setDiscount,
  coupon,
  setCoupon,
  couponStatus,
  setCouponStatus,
  couponError,
  setCouponError,
  loggedUser,
  onCreateAccount
}) {
  var [step, setStep] = useState("form");
  var [name, setName] = useState("");
  var [phone, setPhone] = useState("");
  var [checkoutUser, setCheckoutUser] = useState(null);
  var [trustedDeviceCheckout, setTrustedDeviceCheckout] = useState(false);
  var [checkoutVerificationTicket, setCheckoutVerificationTicket] = useState("");
  var [phoneStatus, setPhoneStatus] = useState(null);
  var [phoneChecking, setPhoneChecking] = useState(false);
  var [priceNotice, setPriceNotice] = useState("");
  var [city, setCity] = useState("");
  var [area, setArea] = useState("");
  var [street, setStreet] = useState("");
  var [errorMsg, setErrorMsg] = useState("");
  var [orderRef, setOrderRef] = useState("");
  var [isBusy, setIsBusy] = useState(false);
  var [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  var [otpPurpose, setOtpPurpose] = useState("phone");
  var [otpError, setOtpError] = useState("");
  var [timeLeft, setTimeLeft] = useState(120);
  var [timerKey, setTimerKey] = useState(0);
  var [savedAddresses, setSavedAddresses] = useState([]);
  var [selectedAddressId, setSelectedAddressId] = useState("");
  var [loadingAddresses, setLoadingAddresses] = useState(false);
  var [showAddAddressForm, setShowAddAddressForm] = useState(false);
  var [addressSaveStatus, setAddressSaveStatus] = useState(null);
  var [newAddressLabel, setNewAddressLabel] = useState("");
  var [newAddressLine1, setNewAddressLine1] = useState("");
  var [newAddressCity, setNewAddressCity] = useState("");
  var [newAddressDistrict, setNewAddressDistrict] = useState("");
  var [paymentMethod, setPaymentMethod] = useState("cod");
  var [bkashTxnId, setBkashTxnId] = useState("");
  var [bkashTxnError, setBkashTxnError] = useState("");
  var [showBkashQr, setShowBkashQr] = useState(false);
  var [bkashTxnChecking, setBkashTxnChecking] = useState(false);
  var otpRefs = useRef([]);
  var timerRef = useRef(null);
  var isMobile = useIsMobile();
  injectMpSheetStyle();
  var activeUser = checkoutUser;
  var pricingOverride = phoneStatus?.phone === normalizeBdMobile(phone) && phoneStatus?.pricing ? phoneStatus.pricing : null;
  var effectiveProduct = pricingOverride ? {
    ...product,
    originalPrice: pricingOverride.original_price ?? product.originalPrice,
    salePrice: pricingOverride.sale_price ?? product.salePrice,
    discountAmount: pricingOverride.discount_amount ?? product.discountAmount,
    discountMaxQty: pricingOverride.discount_max_qty ?? product.discountMaxQty,
    discountMaxOrders: pricingOverride.discount_orders_limit ?? product.discountMaxOrders,
    discountBlocked: !!pricingOverride.discount_blocked
  } : product;
  var pricing = calculateProductPricing(effectiveProduct, qty);
  var totalPrice = Math.max(0, pricing.productSubtotal - discount);
  var checkoutCharges = calculateCheckoutCharges(effectiveProduct, qty, {
    city,
    area
  }, totalPrice);
  var effectiveCodFee = paymentMethod === "bkash" ? 0 : checkoutCharges.codFee;
  var effectiveFinalTotal = checkoutCharges.shippingCost + effectiveCodFee + totalPrice;
  var discountCapMessage = getDiscountCapMessage(effectiveProduct, qty);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (open && loggedUser?.id) {
      fetch(`${API_BASE}/me`, {
        credentials: "include"
      }).then(r => r.json()).then(json => {
        if (json?.ok && json.data?.phone) {
          setCheckoutUser(json.data);
          setName(json.data.name || "");
          setPhone(json.data.phone || "");
          setStep("details");
          setLoadingAddresses(true);
          return fetch(`${API_BASE}/me/addresses`, {
            credentials: "include"
          }).then(r => r.json()).then(addrJson => {
            if (addrJson?.ok && Array.isArray(addrJson.data)) {
              setSavedAddresses(addrJson.data);
              var defaultAddr = addrJson.data.find(a => a.is_default) || addrJson.data[0];
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                setStreet(defaultAddr.line1 || "");
                setCity(defaultAddr.city || "");
                setArea(defaultAddr.district || "");
              }
            }
          });
        }
      }).catch(() => {}).finally(() => setLoadingAddresses(false));
    }
  }, [open, loggedUser?.id]);
  useEffect(() => {
    if (open) {
      setStep("form");
      setErrorMsg("");
      setOrderRef("");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError("");
      setOtpPurpose("phone");
      setIsBusy(false);
      setTimerKey(0);
      setCheckoutUser(null);
      setTrustedDeviceCheckout(false);
      setCheckoutVerificationTicket("");
      setPhoneStatus(null);
      setPhoneChecking(false);
      setPriceNotice("");
      setCity("");
      setArea("");
      setStreet("");
      setShowAddAddressForm(false);
      setAddressSaveStatus(null);
      setNewAddressLabel("");
      setNewAddressLine1("");
      setNewAddressCity("");
      setNewAddressDistrict("");
      setPaymentMethod("cod");
      setBkashTxnId("");
      setBkashTxnError("");
      setShowBkashQr(false);
      setBkashTxnChecking(false);
      setName("");
      setPhone("");
    }
  }, [open, loggedUser?.phone]);
  var fetchDeviceStatus = async (p, signal) => {
    var res = await fetch(`${API_BASE}/orders/device-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: p,
        ...(product?.id ? {
          product_id: product.id
        } : {})
      }),
      credentials: "include",
      signal
    });
    var json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json?.error?.message || "Couldn't check this device.");
    return {
      ...json.data,
      phone: p
    };
  };
  var productWithPricingOverride = (baseProduct, pricingOverride) => pricingOverride ? {
    ...baseProduct,
    originalPrice: pricingOverride.original_price ?? baseProduct.originalPrice,
    salePrice: pricingOverride.sale_price ?? baseProduct.salePrice,
    discountAmount: pricingOverride.discount_amount ?? baseProduct.discountAmount,
    discountMaxQty: pricingOverride.discount_max_qty ?? baseProduct.discountMaxQty,
    discountMaxOrders: pricingOverride.discount_orders_limit ?? baseProduct.discountMaxOrders,
    discountBlocked: !!pricingOverride.discount_blocked
  } : baseProduct;
  var showPriceNoticeAlert = message => {
    if (!message) return;
    if (window.Swal?.fire) {
      window.Swal.fire({
        icon: "info",
        title: "Regular price applies",
        text: message,
        background: "#FFF3DC",
        color: "#571F29",
        confirmButtonColor: "#571F29",
        confirmButtonText: "Got it"
      });
      return;
    }
    window.alert(message);
  };
  var verifyCheckoutCoupon = async () => {
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
      var res = await fetch(`${API_BASE}/coupons/validate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: coupon.trim(),
          subtotal: pricing.productSubtotal,
          customer_phone: normalizedPhone,
          ...(product?.id ? {
            product_id: product.id
          } : {})
        })
      });
      var json = await res.json().catch(() => null);
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
  var applyTrustedCheckout = status => {
    var user = status?.user;
    if (!user) return;
    localStorage.setItem("mp_user", JSON.stringify(user));
    setCheckoutUser(user);
    setTrustedDeviceCheckout(true);
    setName(user?.name || "");
    var addresses = Array.isArray(status.addresses) ? status.addresses : [];
    setSavedAddresses(addresses);
    var defaultAddr = addresses.find(a => a.is_default) || addresses[0];
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
  var resetTrustedCheckout = () => {
    setStep("form");
    setCheckoutUser(null);
    setTrustedDeviceCheckout(false);
    setCheckoutVerificationTicket("");
    setPhoneStatus(null);
    setPriceNotice("");
    setSavedAddresses([]);
    setSelectedAddressId("");
    setCity("");
    setArea("");
    setStreet("");
    setShowAddAddressForm(false);
    setName("");
    setPhone("");
    setErrorMsg("");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError("");
    setOtpPurpose("phone");
    setTimeout(() => document.querySelector('input[type="tel"]')?.focus(), 50);
  };
  useEffect(() => {
    if (!open || loggedUser?.phone || step !== "form") return;
    var p = normalizeBdMobile(phone);
    if (!isValidBdMobile(p)) {
      setPhoneStatus(null);
      setPhoneChecking(false);
      return;
    }
    var controller = new AbortController();
    var timer = setTimeout(async () => {
      setPhoneChecking(true);
      try {
        var status = await fetchDeviceStatus(p, controller.signal);
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
  useEffect(() => {
    if (step !== "otp") return;
    setTimeLeft(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timerKey]);
  useEffect(() => {
    if (!open || paymentMethod !== "bkash") {
      setBkashTxnChecking(false);
      return;
    }
    var txnId = bkashTxnId.trim().toUpperCase();
    if (!BKASH_TXN_ID_PATTERN.test(txnId)) {
      setBkashTxnChecking(false);
      return;
    }
    var cancelled = false;
    var timer = setTimeout(async () => {
      setBkashTxnChecking(true);
      try {
        var res = await fetch(`${API_BASE}/orders/bkash-txn/check?txn_id=${encodeURIComponent(txnId)}`);
        var json = await res.json().catch(() => null);
        if (cancelled) return;
        if (json?.ok && json.data?.exists) {
          setBkashTxnError("This bKash transaction ID has already been used. Please check and enter a unique transaction ID.");
        }
      } catch {} finally {
        if (!cancelled) setBkashTxnChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, paymentMethod, bkashTxnId]);
  var fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if (!open) return null;
  var composedAddress = street.trim();
  var normalizedPhone = normalizeBdMobile(phone);
  var phoneStatusReady = phoneStatus?.phone === normalizedPhone;
  var guestTrustedDevice = !loggedUser?.phone && phoneStatusReady && phoneStatus.trusted;
  var guestNeedsOtp = !loggedUser?.phone && phoneStatusReady && !phoneStatus.trusted;
  var phoneStatusHint = phoneChecking ? "Checking this number..." : guestTrustedDevice ? "This device is verified for faster checkout." : guestNeedsOtp ? "We'll send a verification code for this phone." : "Cash on delivery";
  var overlay = isMobile ? {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    zIndex: 1100,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 0
  } : {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px"
  };
  var panel = isMobile ? {
    background: "#F7E3C9",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: "100%",
    maxHeight: "92dvh",
    overflowY: "auto",
    overflowX: "hidden",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
    animation: "mpSheetSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both"
  } : {
    background: "#FFFDF7",
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
    maxHeight: "92dvh",
    overflowY: "auto",
    overflowX: "hidden"
  };
  var sheetHandle = isMobile ? React.createElement("div", {
    style: {
      width: 36,
      height: 4,
      borderRadius: 2,
      background: "rgba(87,31,41,0.2)",
      margin: "10px auto 4px",
      flexShrink: 0
    },
    "aria-hidden": "true"
  }) : null;
  var field = {
    width: "100%",
    padding: "9px 12px",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    background: "#fff",
    color: "#333",
    outline: "none",
    boxSizing: "border-box"
  };
  var lbl = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(87,31,41,.65)",
    marginBottom: 5,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: ".04em"
  };
  var hdr = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isMobile ? "14px 22px 14px" : "18px 22px 14px",
    borderBottom: "1px solid rgba(87,31,41,.1)"
  };
  var primBtn = busy => ({
    width: "100%",
    padding: 14,
    background: busy ? "rgba(87,31,41,.35)" : "#571F29",
    color: "#fff",
    borderRadius: 10,
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 15,
    border: "none",
    cursor: busy ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background .2s"
  });
  var SummaryStrip = () => {
    var productLabel = `${effectiveProduct.name} - ${effectiveProduct.weight} × ${qty}`;
    var offerActive = !effectiveProduct.discountBlocked && pricing.productDiscountTotal > 0;
    var displayedProductTotal = totalPrice;
    return React.createElement("div", {
      className: "checkout-summary-card"
    }, React.createElement("div", {
      className: "checkout-summary-product"
    }, React.createElement("span", {
      className: "checkout-summary-name"
    }, productLabel), React.createElement("span", {
      className: "checkout-summary-price"
    }, offerActive ? React.createElement(React.Fragment, null, React.createElement("span", {
      className: "checkout-summary-original"
    }, "\u09F3", pricing.originalSubtotal.toLocaleString()), React.createElement("strong", null, "\u09F3", displayedProductTotal.toLocaleString())) : React.createElement("strong", null, "\u09F3", displayedProductTotal.toLocaleString()))), offerActive && React.createElement("div", {
      className: "checkout-summary-offer"
    }, React.createElement("span", {
      className: "checkout-summary-badge",
      "aria-label": `Discount: ৳${pricing.productDiscountTotal.toLocaleString()} off`
    }, "\u09F3", pricing.productDiscountTotal.toLocaleString(), " OFF"), React.createElement("span", null, effectiveProduct.discountLabel || "Product offer", discountCapMessage ? ` · ${discountCapMessage}` : "")), React.createElement("div", {
      className: "checkout-summary-divider"
    }), React.createElement("div", {
      className: "checkout-summary-breakdown"
    }, React.createElement("div", null, React.createElement("span", null, "Delivery"), React.createElement("strong", null, "\u09F3", checkoutCharges.shippingCost.toLocaleString())), paymentMethod === "cod" && React.createElement("div", null, React.createElement("span", null, "COD charge (1%)"), React.createElement("strong", null, "\u09F3", effectiveCodFee.toLocaleString())), paymentMethod === "bkash" && React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between"
      }
    }, React.createElement("span", {
      style: {
        color: "#1a9a50",
        fontWeight: 600
      }
    }, "bKash \u2014 no COD charge"), React.createElement("strong", {
      style: {
        color: "#1a9a50"
      }
    }, "\u09F30"))), discount > 0 && React.createElement("div", {
      className: "checkout-summary-coupon"
    }, React.createElement("span", null, "Coupon"), React.createElement("strong", null, "-\u09F3", discount.toLocaleString())), React.createElement("div", {
      className: "checkout-summary-total"
    }, React.createElement("span", null, "Total"), React.createElement("strong", null, "\u09F3", effectiveFinalTotal.toLocaleString())));
  };
  if (step === "success") return React.createElement("div", {
    style: overlay,
    onClick: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    style: {
      ...panel,
      maxHeight: isMobile ? "92dvh" : "90dvh",
      overflowY: "auto"
    }
  }, sheetHandle, React.createElement("div", {
    style: {
      padding: "28px 24px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      width: 54,
      height: 54,
      borderRadius: "50%",
      background: "rgba(46,94,31,.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      fontSize: 26,
      color: "#2E5E1F"
    },
    "aria-hidden": "true"
  })), React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 22,
      color: "#571F29",
      margin: "0 0 6px"
    }
  }, "Order Placed!"), React.createElement("p", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      color: "#FF9100",
      margin: "0 0 10px"
    }
  }, "#", orderRef), paymentMethod === "bkash" ? React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13.5,
      color: "rgba(87,31,41,.65)",
      margin: "0 0 18px",
      lineHeight: 1.5
    }
  }, "Your order ", React.createElement("strong", null, "#", orderRef), " is under review. Our team is verifying your bKash transaction (", React.createElement("strong", null, bkashTxnId), "). You will receive an SMS confirmation at ", React.createElement("strong", null, phone), " within 30 minutes.") : React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13.5,
      color: "rgba(87,31,41,.65)",
      margin: "0 0 18px",
      lineHeight: 1.5
    }
  }, "A confirmation SMS has been sent to ", React.createElement("strong", null, phone), "."), typeof MPFeedbackCard === "function" && React.createElement(MPFeedbackCard, {
    orderRef: orderRef
  }), !activeUser && React.createElement("div", {
    className: "shop-post-order-member"
  }, React.createElement("div", {
    className: "shop-post-order-badge"
  }, "MIDNIGHT CIRCLE"), React.createElement("strong", null, "Save this order and collect points."), React.createElement("span", null, "Create an account to track your pouch, save your address, collect Midnight Points, and manage future monthly plans."), React.createElement("button", {
    onClick: () => {
      onClose();
      onCreateAccount?.();
    }
  }, "Create My Account")), React.createElement("button", {
    onClick: onClose,
    style: {
      padding: "12px 36px",
      background: "#571F29",
      color: "#F7E3C9",
      borderRadius: 8,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 14,
      border: "none",
      cursor: "pointer"
    }
  }, "Done"))));
  if (step === "error") return React.createElement("div", {
    style: overlay,
    onClick: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    style: panel
  }, sheetHandle, React.createElement("div", {
    style: {
      padding: "36px 28px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: "50%",
      background: "rgba(200,40,40,.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    style: {
      fontSize: 28,
      color: "#C82828"
    },
    "aria-hidden": "true"
  })), React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 20,
      color: "#571F29",
      margin: "0 0 10px"
    }
  }, "Something went wrong"), React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "rgba(87,31,41,.7)",
      margin: "0 0 24px",
      lineHeight: 1.5
    }
  }, errorMsg), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, React.createElement("button", {
    onClick: () => setStep("form"),
    style: {
      padding: "11px 24px",
      background: "#571F29",
      color: "#F7E3C9",
      borderRadius: 8,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 14,
      border: "none",
      cursor: "pointer"
    }
  }, "Try Again"), React.createElement("button", {
    onClick: onClose,
    style: {
      padding: "11px 24px",
      background: "rgba(87,31,41,.08)",
      color: "#571F29",
      borderRadius: 8,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 14,
      border: "none",
      cursor: "pointer"
    }
  }, "Cancel")))));
  if (step === "otp") {
    var otpComplete = otpDigits.every(d => d !== "");
    var handleDigit = (idx, val) => {
      if (!/^\d*$/.test(val)) return;
      var d = [...otpDigits];
      d[idx] = val.slice(-1);
      setOtpDigits(d);
      if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };
    var handleKey = (idx, e) => {
      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
        var d = [...otpDigits];
        d[idx - 1] = "";
        setOtpDigits(d);
        otpRefs.current[idx - 1]?.focus();
      }
    };
    var handlePaste = e => {
      var pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      e.preventDefault();
      var d = Array(6).fill("");
      pasted.split("").forEach((c, i) => {
        d[i] = c;
      });
      setOtpDigits(d);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };
    var handleVerify = async () => {
      if (!otpComplete || isBusy) return;
      setIsBusy(true);
      setOtpError("");
      try {
        if (otpPurpose === "address") {
          var order;
          try {
            var verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                phone: normalizedPhone,
                otp: otpDigits.join(""),
                purpose: "change_address"
              }),
              credentials: "include"
            });
            var verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson.ok) {
              var err = new Error(verifyJson?.error?.message || "Invalid OTP.");
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
        var res = await fetch(`${API_BASE}/auth/otp/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            otp: otpDigits.join(""),
            purpose: "checkout"
          }),
          credentials: "include"
        });
        var json = await res.json();
        if (!res.ok) {
          var code = json?.error?.code;
          if (code === "INVALID_OTP" || code === "OTP_MAX_ATTEMPTS") {
            setOtpError(json.error.message);
          } else {
            setErrorMsg(json?.error?.message || "Order failed. Please try again.");
            setStep("error");
          }
          return;
        }
        var user = json.data.user;
        localStorage.setItem("mp_user", JSON.stringify(user));
        setCheckoutUser(user);
        setTrustedDeviceCheckout(false);
        setCheckoutVerificationTicket(json.data.verification_ticket || "");
        var nextPhoneStatus = phoneStatus?.phone === normalizedPhone ? {
          ...phoneStatus,
          trusted: true,
          user,
          addresses: savedAddresses
        } : {
          phone: normalizedPhone,
          trusted: true,
          user,
          addresses: savedAddresses
        };
        setPhoneStatus(nextPhoneStatus);
        setPriceNotice(nextPhoneStatus?.pricing?.message || "");
        try {
          var refreshedStatus = await fetchDeviceStatus(normalizedPhone);
          setPhoneStatus(refreshedStatus);
          if (Array.isArray(refreshedStatus.addresses)) setSavedAddresses(refreshedStatus.addresses);
          var refreshedMessage = refreshedStatus?.pricing?.message || "";
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
    var resendOtp = async () => {
      try {
        await fetch(`${API_BASE}/orders/request-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            purpose: otpPurpose === "address" ? "change_address" : "checkout"
          })
        });
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");
        setTimerKey(k => k + 1);
      } catch {}
    };
    return React.createElement("div", {
      style: overlay,
      onClick: e => e.target === e.currentTarget && onClose()
    }, React.createElement("div", {
      style: panel
    }, sheetHandle, React.createElement("div", {
      style: hdr
    }, React.createElement("button", {
      onClick: () => setStep(otpPurpose === "address" ? "details" : "form"),
      "aria-label": "Back",
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#571F29",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, React.createElement("i", {
      className: "fa-solid fa-arrow-left",
      "aria-hidden": "true"
    }), " Back"), React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 15,
        color: "#571F29"
      }
    }, "Verify Phone"), React.createElement("button", {
      onClick: onClose,
      "aria-label": "Close",
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#571F29",
        fontSize: 20,
        lineHeight: 1
      }
    }, "\xD7")), React.createElement(SummaryStrip, null), React.createElement("div", {
      style: {
        padding: "26px 22px 24px"
      }
    }, React.createElement("p", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 14,
        color: "rgba(87,31,41,.75)",
        margin: "0 0 22px",
        textAlign: "center",
        lineHeight: 1.5
      }
    }, otpPurpose === "address" ? "Confirm this new delivery address with the 6-digit code sent to" : "Enter the 6-digit code sent to", React.createElement("br", null), React.createElement("strong", {
      style: {
        color: "#571F29"
      }
    }, phone)), React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        justifyContent: "center",
        marginBottom: 18
      }
    }, [0, 1, 2, 3, 4, 5].map(i => React.createElement("input", {
      key: i,
      ref: el => otpRefs.current[i] = el,
      type: "text",
      inputMode: "numeric",
      maxLength: 1,
      value: otpDigits[i],
      onChange: e => handleDigit(i, e.target.value),
      onKeyDown: e => handleKey(i, e),
      onPaste: handlePaste,
      disabled: isBusy,
      style: {
        flex: "1 1 0",
        minWidth: 0,
        maxWidth: 46,
        height: 52,
        padding: 0,
        boxSizing: "border-box",
        textAlign: "center",
        fontSize: 22,
        fontWeight: 800,
        fontFamily: "var(--font-display)",
        border: `2px solid ${otpDigits[i] ? "#571F29" : "rgba(87,31,41,.22)"}`,
        borderRadius: 10,
        background: otpDigits[i] ? "rgba(87,31,41,.04)" : "#fff",
        color: "#571F29",
        outline: "none",
        transition: "border-color .15s, background .15s"
      }
    }))), otpError && React.createElement("p", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "#C82828",
        textAlign: "center",
        margin: "0 0 12px",
        background: "rgba(200,40,40,.06)",
        padding: "8px 12px",
        borderRadius: 7
      }
    }, React.createElement("i", {
      className: "fa-solid fa-circle-xmark",
      "aria-hidden": "true",
      style: {
        marginRight: 5
      }
    }), otpError), React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 20
      }
    }, timeLeft > 0 ? React.createElement("span", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "rgba(87,31,41,.5)"
      }
    }, React.createElement("i", {
      className: "fa-regular fa-clock",
      "aria-hidden": "true",
      style: {
        marginRight: 5
      }
    }), "Resend in ", React.createElement("strong", {
      style: {
        color: "#571F29",
        fontVariantNumeric: "tabular-nums"
      }
    }, fmtTime(timeLeft))) : React.createElement("button", {
      onClick: resendOtp,
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 13,
        color: "#FF9100",
        textDecoration: "underline",
        textUnderlineOffset: 2
      }
    }, React.createElement("i", {
      className: "fa-solid fa-rotate-right",
      "aria-hidden": "true",
      style: {
        marginRight: 5
      }
    }), "Resend OTP")), React.createElement("button", {
      onClick: handleVerify,
      disabled: !otpComplete || isBusy,
      style: primBtn(!otpComplete || isBusy)
    }, isBusy ? React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-spinner fa-spin",
      "aria-hidden": "true"
    }), " Verifying\u2026") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-check",
      "aria-hidden": "true"
    }), " Verify & Continue")))));
  }
  var handlePhoneSubmit = async e => {
    e.preventDefault();
    if (!phone.trim() || isBusy) return;
    if (!isValidBdMobile(phone)) {
      setErrorMsg("Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX.");
      return;
    }
    setPhone(normalizedPhone);
    setIsBusy(true);
    try {
      var status = phoneStatus?.phone === normalizedPhone ? phoneStatus : null;
      if (!status) {
        setPhoneChecking(true);
        status = await fetchDeviceStatus(normalizedPhone);
        setPhoneStatus(status);
        setPriceNotice(status?.pricing?.message || "");
        setPhoneChecking(false);
      }
      setPriceNotice(status?.pricing?.message || "");
      var statusProduct = productWithPricingOverride(product, status?.pricing);
      var statusPricing = calculateProductPricing(statusProduct, qty);
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
        var vres = await fetch(`${API_BASE}/coupons/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            code: coupon,
            subtotal: statusPricing.productSubtotal,
            customer_phone: normalizedPhone,
            ...(product?.id ? {
              product_id: product.id
            } : {})
          })
        });
        var vjson = await vres.json().catch(() => null);
        if (!vres.ok) {
          setErrorMsg(vjson?.error?.message || "This coupon can't be used for this order.");
          setStep("error");
          return;
        }
        window.mpDismissBannerForCoupon?.(coupon);
      }
      var res = await fetch(`${API_BASE}/orders/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          purpose: "checkout"
        })
      });
      var json = await res.json();
      if (!res.ok) throw new Error(checkoutApiErrorMessage(json?.error, "Failed to send OTP."));
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError("");
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
  var placeQuickOrder = async (verificationTicket = null) => {
    var trustedCheckout = trustedDeviceCheckout && !!checkoutUser?.phone;
    var ticketCheckout = !!checkoutVerificationTicket && !trustedCheckout;
    var quickCheckout = !trustedCheckout && !ticketCheckout && !!loggedUser?.id;
    var endpoint = ticketCheckout ? `${API_BASE}/orders/guest` : trustedCheckout ? `${API_BASE}/orders/trusted` : quickCheckout ? `${API_BASE}/orders/quick` : `${API_BASE}/orders/guest`;
    var res = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...(trustedCheckout ? {
          phone: normalizedPhone
        } : {}),
        ...(ticketCheckout ? {
          phone: normalizedPhone,
          name: name.trim(),
          verification_ticket: checkoutVerificationTicket
        } : {}),
        ...(verificationTicket ? {
          verification_ticket: verificationTicket
        } : {}),
        qty,
        address: composedAddress,
        city,
        district: area,
        ...(coupon ? {
          coupon_code: coupon
        } : {}),
        ...(product?.id ? {
          product_id: product.id
        } : {}),
        payment_method: paymentMethod,
        ...(paymentMethod === "bkash" && bkashTxnId.trim() ? {
          bkash_txn_id: bkashTxnId.trim().toUpperCase()
        } : {})
      })
    });
    var json = await res.json();
    if (!res.ok) {
      var err = new Error(json?.error?.message || "Order failed. Please try again.");
      err.code = json?.error?.code;
      throw err;
    }
    return json.data;
  };
  var handleDetailsSubmit = async e => {
    e.preventDefault();
    var hasAddress = Boolean(city && area && street.trim());
    if (!name.trim() || !hasAddress || isBusy) return;
    setIsBusy(true);
    setErrorMsg("");
    try {
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
        var res = await fetch(`${API_BASE}/orders/request-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            purpose: "change_address"
          })
        });
        var json = await res.json();
        if (!res.ok) throw new Error(checkoutApiErrorMessage(json?.error, "Failed to send OTP."));
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");
        setOtpPurpose("address");
        setTimerKey(k => k + 1);
        setStep("otp");
        return;
      }
      if (loggedUser?.id && !checkoutVerificationTicket && (!activeUser?.name || activeUser.name !== name.trim())) {
        var profileRes = await fetch(`${API_BASE}/me`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: name.trim()
          })
        });
        var profileJson = await profileRes.json();
        if (!profileRes.ok || !profileJson.ok) throw new Error(profileJson?.error?.message || "Couldn't save your name.");
        var updatedUser = {
          ...checkoutUser,
          ...profileJson.data
        };
        localStorage.setItem("mp_user", JSON.stringify(updatedUser));
        setCheckoutUser(updatedUser);
      }
      if (loggedUser?.id && !checkoutVerificationTicket && !selectedAddressId) {
        await fetch(`${API_BASE}/me/addresses`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            label: "Delivery",
            line1: composedAddress,
            city,
            district: area,
            is_default: true
          })
        }).catch(() => null);
      }
      var order = await placeQuickOrder();
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
  var hasAddress = Boolean(city && area && street.trim());
  var needsNameEntry = !activeUser?.name;
  var canSubmitPhone = isValidBdMobile(phone) && !isBusy && !phoneChecking;
  var bkashValid = paymentMethod !== "bkash" || BKASH_TXN_ID_PATTERN.test(bkashTxnId.trim().toUpperCase()) && !bkashTxnError && !bkashTxnChecking;
  var canSubmitDetails = (!needsNameEntry || name.trim()) && hasAddress && !isBusy && bkashValid;
  return React.createElement("div", {
    style: overlay,
    onClick: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    style: panel,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "modal-title"
  }, sheetHandle, React.createElement("div", {
    style: hdr
  }, React.createElement("span", {
    id: "modal-title",
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 16,
      color: "#571F29"
    }
  }, "Place Order"), React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#571F29",
      fontSize: 20,
      lineHeight: 1
    }
  }, "\xD7")), React.createElement("form", {
    onSubmit: step === "details" ? handleDetailsSubmit : handlePhoneSubmit,
    className: "checkout-modal-body"
  }, React.createElement(SummaryStrip, null), activeUser?.phone && React.createElement("div", {
    className: "checkout-identity-card"
  }, React.createElement("div", {
    className: "checkout-identity-phone"
  }, React.createElement("span", {
    className: "checkout-identity-check",
    "aria-hidden": "true"
  }, "\u2713"), React.createElement("span", {
    className: "checkout-identity-phone-text"
  }, React.createElement("span", null, "Phone confirmed"), React.createElement("strong", {
    "aria-label": `Confirmed phone: ${phone}`
  }, phone)), React.createElement("button", {
    type: "button",
    onClick: resetTrustedCheckout,
    "aria-label": "Use a different phone number"
  }, "Change")), !needsNameEntry && React.createElement("div", {
    className: "checkout-identity-user"
  }, React.createElement("span", {
    className: "checkout-identity-avatar",
    "aria-hidden": "true"
  }, String(name || "MP").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()), React.createElement("span", null, React.createElement("strong", null, name), React.createElement("small", null, "Ordering for this account")))), step === "form" && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    style: lbl
  }, "Phone Number"), React.createElement("input", {
    style: field,
    type: "tel",
    placeholder: "01XXXXXXXXX",
    value: phone,
    onChange: e => {
      setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20));
      setErrorMsg("");
    },
    required: true,
    disabled: isBusy,
    autoComplete: "tel",
    autoFocus: true
  }), phone.trim() && !isValidBdMobile(phone) && React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "#C82828",
      marginTop: 6
    }
  }, "Use a Bangladesh mobile number: 013-019, 11 digits locally or +880 format."), isValidBdMobile(phone) && React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "rgba(87,31,41,.55)",
      marginTop: 6
    }
  }, phoneStatusHint), priceNotice && React.createElement("div", {
    style: {
      marginTop: 8,
      padding: "9px 11px",
      borderRadius: 8,
      background: "rgba(255,145,0,.08)",
      border: "1px solid rgba(255,145,0,.22)",
      color: "#B36200",
      fontFamily: "var(--font-body)",
      fontSize: 12,
      lineHeight: 1.45
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info",
    "aria-hidden": "true",
    style: {
      marginRight: 6
    }
  }), priceNotice))), step === "details" && React.createElement(React.Fragment, null, needsNameEntry ? React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    style: lbl
  }, "Full Name"), React.createElement("input", {
    style: field,
    type: "text",
    placeholder: "Your full name",
    value: name,
    onChange: e => setName(e.target.value),
    required: true,
    disabled: isBusy,
    autoFocus: !name,
    autoComplete: "name"
  })) : null, effectiveProduct.discountBlocked && React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    style: lbl
  }, "Coupon Code"), React.createElement("div", {
    className: "shop-coupon-row",
    style: {
      margin: 0
    }
  }, React.createElement("div", {
    className: "shop-coupon-wrap",
    style: {
      flexDirection: "row",
      borderRadius: 8
    }
  }, React.createElement("input", {
    className: "shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : ""),
    type: "text",
    placeholder: "Enter coupon code",
    value: coupon,
    onChange: e => {
      setCoupon?.(e.target.value.toUpperCase());
      setCouponStatus?.("idle");
      setCouponError?.("");
      setDiscount?.(0);
    },
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyCheckoutCoupon();
      }
    },
    "aria-label": "Coupon code",
    disabled: isBusy
  }), React.createElement("button", {
    type: "button",
    className: "shop-coupon-btn",
    onClick: verifyCheckoutCoupon,
    disabled: isBusy || couponStatus === "loading" || !coupon.trim(),
    style: {
      borderRadius: 0,
      padding: "0 18px"
    }
  }, couponStatus === "loading" ? React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    "aria-hidden": "true"
  }) : "Apply")), couponStatus === "ok" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--ok"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), " Coupon applied - \u09F3", discount, " off"), couponStatus === "err" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--err"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    "aria-hidden": "true"
  }), " ", couponError))), React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#999",
      marginBottom: 8,
      fontFamily: "var(--font-display)"
    }
  }, "Payment Method"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => {
      setPaymentMethod("cod");
      setBkashTxnId("");
      setBkashTxnError("");
      setShowBkashQr(false);
      setBkashTxnChecking(false);
    },
    style: {
      padding: "12px 10px",
      minHeight: 164,
      height: 164,
      borderRadius: 12,
      border: paymentMethod === "cod" ? "2px solid #571F29" : "1.5px solid #e0e0e0",
      background: paymentMethod === "cod" ? "rgba(87,31,41,0.06)" : "#fff",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      justifyContent: "center",
      transition: "all 0.15s",
      boxSizing: "border-box"
    },
    "aria-pressed": paymentMethod === "cod"
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: paymentMethod === "cod" ? "rgba(87,31,41,0.1)" : "rgba(0,0,0,0.04)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-money-bill-wave",
    "aria-hidden": "true",
    style: {
      fontSize: 16,
      color: paymentMethod === "cod" ? "#571F29" : "#aaa"
    }
  })), React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 13,
      color: paymentMethod === "cod" ? "#571F29" : "#999"
    }
  }, "Cash on Delivery"), React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10.5,
      color: "#aaa",
      lineHeight: 1.35,
      textAlign: "center"
    }
  }, "Pay when you receive"), paymentMethod === "cod" && React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "#571F29",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2
    }
  }, React.createElement("i", {
    className: "fa-solid fa-check",
    "aria-hidden": "true",
    style: {
      fontSize: 9,
      color: "#fff"
    }
  })), paymentMethod !== "cod" && React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      marginTop: 2
    },
    "aria-hidden": "true"
  })), React.createElement("button", {
    type: "button",
    onClick: () => {
      setPaymentMethod("bkash");
      setBkashTxnId("");
      setBkashTxnError("");
      setShowBkashQr(false);
      setBkashTxnChecking(false);
    },
    style: {
      padding: "12px 10px",
      minHeight: 164,
      height: 164,
      borderRadius: 12,
      border: paymentMethod === "bkash" ? "2px solid #E2136E" : "1.5px solid #e0e0e0",
      background: paymentMethod === "bkash" ? "#FDE8F2" : "#fff",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      justifyContent: "center",
      transition: "all 0.15s",
      boxSizing: "border-box"
    },
    "aria-pressed": paymentMethod === "bkash"
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: paymentMethod === "bkash" ? "rgba(226,19,110,0.12)" : "rgba(0,0,0,0.04)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-mobile-screen-button",
    "aria-hidden": "true",
    style: {
      fontSize: 16,
      color: paymentMethod === "bkash" ? "#E2136E" : "#aaa"
    }
  })), React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 13,
      color: paymentMethod === "bkash" ? "#E2136E" : "#999"
    }
  }, "bKash"), React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10.5,
      color: "#aaa",
      lineHeight: 1.35,
      textAlign: "center"
    }
  }, "No extra charge"), paymentMethod === "bkash" && React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "#E2136E",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2
    }
  }, React.createElement("i", {
    className: "fa-solid fa-check",
    "aria-hidden": "true",
    style: {
      fontSize: 9,
      color: "#fff"
    }
  })), paymentMethod !== "bkash" && React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      marginTop: 2
    },
    "aria-hidden": "true"
  }))), paymentMethod === "bkash" && React.createElement("div", {
    style: {
      background: "#FDE8F2",
      border: "1.5px solid rgba(226,19,110,0.25)",
      borderRadius: 14,
      padding: "16px 16px 14px",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "rgba(226,19,110,0.12)",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info",
    "aria-hidden": "true",
    style: {
      color: "#E2136E",
      fontSize: 16
    }
  })), React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12.5,
      color: "#8B0040",
      lineHeight: 1.55,
      margin: 0
    }
  }, "Send ", React.createElement("strong", null, "\u09F3", effectiveFinalTotal.toLocaleString()), " to our bKash merchant number below. Then enter your transaction ID to complete the order.")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, React.createElement("div", {
    style: {
      width: "100%",
      background: "#fff",
      border: "1px solid rgba(226,19,110,0.2)",
      borderRadius: 10,
      padding: "10px 14px",
      boxSizing: "border-box"
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10.5,
      fontWeight: 700,
      color: "#E2136E",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: 4
    }
  }, "bKash Merchant Number"), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      fontSize: 20,
      color: "#571F29",
      letterSpacing: "0.03em",
      fontVariantNumeric: "tabular-nums"
    }
  }, BKASH_MERCHANT_NUMBER), React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "rgba(139,0,64,0.6)",
      marginTop: 3
    }
  }, "(Merchant account)"), React.createElement("button", {
    type: "button",
    onClick: () => {
      navigator.clipboard?.writeText(BKASH_MERCHANT_NUMBER);
    },
    style: {
      marginTop: 8,
      padding: "5px 12px",
      background: "rgba(226,19,110,0.1)",
      border: "1px solid rgba(226,19,110,0.22)",
      borderRadius: 6,
      cursor: "pointer",
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 700,
      color: "#E2136E",
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("i", {
    className: "fa-solid fa-copy",
    "aria-hidden": "true",
    style: {
      fontSize: 10
    }
  }), "Copy number")), React.createElement("button", {
    type: "button",
    onClick: () => setShowBkashQr(v => !v),
    "aria-expanded": showBkashQr,
    style: {
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
    }
  }, React.createElement("i", {
    className: "fa-solid fa-qrcode",
    "aria-hidden": "true",
    style: {
      fontSize: 11
    }
  }), showBkashQr ? "Hide QR code" : "Show QR code"), showBkashQr && React.createElement("div", {
    style: {
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
    }
  }, React.createElement("img", {
    src: BKASH_QR_IMAGE_PATH,
    alt: "bKash QR code for payment",
    style: {
      width: "min(100%, 220px)",
      height: "auto",
      maxHeight: 220,
      borderRadius: 8,
      objectFit: "contain"
    },
    onError: e => {
      e.currentTarget.style.display = "none";
      e.currentTarget.nextElementSibling.style.display = "flex";
    }
  }), React.createElement("div", {
    style: {
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minHeight: 120,
      gap: 6
    }
  }, React.createElement("i", {
    className: "fa-solid fa-qrcode",
    "aria-hidden": "true",
    style: {
      fontSize: 38,
      color: "#E2136E"
    }
  }), React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#E2136E",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textAlign: "center"
    }
  }, "QR Code")), React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10.5,
      color: "rgba(139,0,64,0.6)",
      textAlign: "center"
    }
  }, "Scan to pay"))), React.createElement("div", null, React.createElement("label", {
    style: {
      display: "block",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#8B0040",
      marginBottom: 6,
      fontFamily: "var(--font-display)"
    }
  }, "bKash Transaction ID *"), React.createElement("input", {
    type: "text",
    placeholder: "e.g. ABC1234567",
    value: bkashTxnId,
    onChange: e => {
      setBkashTxnId(e.target.value.trim().toUpperCase());
      setBkashTxnError("");
    },
    maxLength: 10,
    disabled: isBusy,
    "aria-label": "bKash transaction ID",
    style: {
      width: "100%",
      padding: "10px 12px",
      fontSize: 14,
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      letterSpacing: "0.04em",
      border: bkashTxnError ? "1.5px solid #C82828" : bkashTxnId ? "1.5px solid #E2136E" : "1.5px solid rgba(226,19,110,0.3)",
      borderRadius: 8,
      background: "#fff",
      color: "#1a0a0d",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.15s"
    }
  }), bkashTxnError && React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "#C82828",
      marginTop: 5,
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    "aria-hidden": "true"
  }), bkashTxnError), bkashTxnChecking && !bkashTxnError && React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "#8B0040",
      marginTop: 5,
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    "aria-hidden": "true"
  }), "Checking transaction ID...")), React.createElement("div", {
    style: {
      background: "rgba(226,19,110,0.06)",
      border: "1px solid rgba(226,19,110,0.15)",
      borderRadius: 8,
      padding: "9px 12px",
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock",
    "aria-hidden": "true",
    style: {
      color: "#E2136E",
      fontSize: 13,
      marginTop: 1,
      flexShrink: 0
    }
  }), React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "#8B0040",
      lineHeight: 1.5,
      margin: 0
    }
  }, "After placing your order, our team will verify your bKash transaction and confirm your order within ", React.createElement("strong", null, "30 minutes"), ". You will receive an SMS confirmation once verified."))), React.createElement("div", {
    className: "checkout-address-section"
  }, React.createElement("label", {
    className: "checkout-section-label"
  }, "Delivery address"), activeUser?.id && savedAddresses.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("select", {
    style: {
      ...field,
      appearance: "none",
      WebkitAppearance: "none",
      paddingRight: 30,
      cursor: "pointer",
      color: selectedAddressId ? "#1A0A0D" : "rgba(26,10,13,.38)"
    },
    value: selectedAddressId,
    onChange: e => {
      setSelectedAddressId(e.target.value);
      setShowAddAddressForm(false);
      if (e.target.value) {
        var addr = savedAddresses.find(a => a.id === e.target.value);
        if (addr) {
          setStreet(addr.line1);
          setCity(addr.city || "");
          setArea(addr.district || "");
        }
      }
    },
    disabled: isBusy || loadingAddresses
  }, React.createElement("option", {
    value: ""
  }, "Choose a saved address"), savedAddresses.map(addr => React.createElement("option", {
    key: addr.id,
    value: addr.id
  }, addr.label ? `${addr.label} - ${addr.line1.substring(0, 30)}${addr.line1.length > 30 ? '…' : ''}` : addr.line1.substring(0, 50)))), React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 10,
      color: "rgba(87,31,41,.45)",
      pointerEvents: "none"
    }
  }))), React.createElement("button", {
    type: "button",
    onClick: () => {
      setSelectedAddressId("");
      setAddressSaveStatus(null);
      setShowAddAddressForm(v => !v);
    },
    className: "checkout-add-address-btn"
  }, React.createElement("i", {
    className: "fa-solid fa-plus",
    "aria-hidden": "true",
    style: {
      marginRight: 4
    }
  }), showAddAddressForm ? "Use manual address" : "Add new address")), activeUser?.id && savedAddresses.length === 0 && !showAddAddressForm && !loadingAddresses && React.createElement("div", {
    style: {
      padding: "12px 12px",
      background: "rgba(255,145,0,.08)",
      borderRadius: 8,
      border: "1px solid rgba(255,145,0,.2)",
      marginBottom: 12
    }
  }, React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "rgba(87,31,41,.75)",
      fontWeight: 600
    }
  }, React.createElement("i", {
    className: "fa-solid fa-location-dot",
    "aria-hidden": "true",
    style: {
      marginRight: 6,
      color: "#FF9100"
    }
  }), "Save an address for faster checkout next time"), React.createElement("button", {
    type: "button",
    onClick: () => {
      setAddressSaveStatus(null);
      setShowAddAddressForm(true);
    },
    className: "checkout-add-address-btn"
  }, React.createElement("i", {
    className: "fa-solid fa-plus",
    "aria-hidden": "true",
    style: {
      marginRight: 4
    }
  }), "Add new address")), (showAddAddressForm || activeUser?.id && savedAddresses.length === 0) && React.createElement("div", {
    style: {
      background: "rgba(87,31,41,.04)",
      padding: 12,
      borderRadius: 8,
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, React.createElement("label", {
    style: {
      ...lbl,
      fontSize: 11,
      marginBottom: 4
    }
  }, "Address Label (e.g., Home, Office)"), React.createElement("input", {
    style: field,
    type: "text",
    placeholder: "Address label",
    value: newAddressLabel,
    onChange: e => {
      setNewAddressLabel(e.target.value);
      setAddressSaveStatus(null);
    },
    disabled: isBusy
  })), React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, React.createElement("label", {
    style: {
      ...lbl,
      fontSize: 11,
      marginBottom: 4
    }
  }, "Street Address"), React.createElement("input", {
    style: field,
    type: "text",
    placeholder: "House no., road, block, building\u2026",
    value: newAddressLine1,
    onChange: e => {
      setNewAddressLine1(e.target.value);
      setAddressSaveStatus(null);
    },
    disabled: isBusy
  })), React.createElement("div", {
    className: "checkout-address-grid"
  }, React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("label", {
    style: {
      ...lbl,
      fontSize: 11,
      marginBottom: 4,
      display: "block"
    }
  }, "City *"), React.createElement("select", {
    style: {
      ...field,
      appearance: "none",
      WebkitAppearance: "none",
      paddingRight: 30,
      cursor: "pointer",
      color: newAddressCity ? "#1A0A0D" : "rgba(26,10,13,.38)"
    },
    value: newAddressCity,
    onChange: e => {
      setNewAddressCity(e.target.value);
      setNewAddressDistrict("");
      setAddressSaveStatus(null);
    },
    required: true,
    disabled: isBusy
  }, React.createElement("option", {
    value: ""
  }, "City"), Object.keys(BD_AREAS).sort().map(c => React.createElement("option", {
    key: c,
    value: c
  }, c))), React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 10,
      bottom: "50%",
      transform: "translateY(50%)",
      fontSize: 10,
      color: "rgba(87,31,41,.45)",
      pointerEvents: "none"
    }
  })), React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("label", {
    style: {
      ...lbl,
      fontSize: 11,
      marginBottom: 4,
      display: "block"
    }
  }, "District/Area *"), React.createElement("select", {
    style: {
      ...field,
      appearance: "none",
      WebkitAppearance: "none",
      paddingRight: 30,
      cursor: newAddressCity ? "pointer" : "not-allowed",
      color: newAddressDistrict ? "#1A0A0D" : "rgba(26,10,13,.38)",
      opacity: newAddressCity ? 1 : 0.55
    },
    value: newAddressDistrict,
    onChange: e => {
      setNewAddressDistrict(e.target.value);
      setAddressSaveStatus(null);
    },
    required: true,
    disabled: !newAddressCity || isBusy
  }, React.createElement("option", {
    value: ""
  }, newAddressCity ? "Select area" : "Area"), (BD_AREAS[newAddressCity] || []).map(a => React.createElement("option", {
    key: a,
    value: a
  }, a))), React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 10,
      bottom: "50%",
      transform: "translateY(50%)",
      fontSize: 10,
      color: "rgba(87,31,41,.45)",
      pointerEvents: "none"
    }
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("button", {
    type: "button",
    onClick: async () => {
      if (!newAddressLine1.trim() || !newAddressCity || !newAddressDistrict) {
        setAddressSaveStatus({
          type: "err",
          message: "Please fill in street address, city, and district/area."
        });
        return;
      }
      setIsBusy(true);
      setAddressSaveStatus(null);
      try {
        var useCheckoutAddressApi = !!checkoutVerificationTicket || trustedDeviceCheckout || !loggedUser?.id;
        var addressPayload = {
          label: newAddressLabel.trim() || "Untitled",
          line1: newAddressLine1.trim(),
          city: newAddressCity,
          district: newAddressDistrict,
          is_default: savedAddresses.length === 0
        };
        var res = await fetch(`${API_BASE}${useCheckoutAddressApi ? "/orders/checkout-address" : "/me/addresses"}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(useCheckoutAddressApi ? {
            ...addressPayload,
            phone: normalizedPhone,
            ...(checkoutVerificationTicket ? {
              verification_ticket: checkoutVerificationTicket
            } : {})
          } : addressPayload)
        });
        var json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setAddressSaveStatus({
            type: "err",
            message: json?.error?.message || "Failed to save address. Please sign in again and retry."
          });
          return;
        }
        if (!json?.data?.id) {
          setAddressSaveStatus({
            type: "err",
            message: "Address saved response was incomplete. Please refresh and retry."
          });
          return;
        }
        setSavedAddresses(prev => [...prev, json.data]);
        setSelectedAddressId(json.data.id);
        setNewAddressLabel("");
        setNewAddressLine1("");
        setNewAddressCity("");
        setNewAddressDistrict("");
        setShowAddAddressForm(false);
        setStreet(json.data.line1);
        setCity(json.data.city);
        setArea(json.data.district);
        setAddressSaveStatus({
          type: "ok",
          message: "Address saved and selected for this order."
        });
      } catch (err) {
        setAddressSaveStatus({
          type: "err",
          message: err.message || "Failed to save address."
        });
      } finally {
        setIsBusy(false);
      }
    },
    disabled: isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict,
    style: {
      flex: 1,
      padding: "8px 12px",
      background: "#571F29",
      color: "#F7E3C9",
      borderRadius: 6,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 12,
      border: "none",
      cursor: isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict ? "not-allowed" : "pointer",
      opacity: isBusy || !newAddressLine1.trim() || !newAddressCity || !newAddressDistrict ? 0.55 : 1
    }
  }, React.createElement("i", {
    className: "fa-solid fa-check",
    "aria-hidden": "true",
    style: {
      marginRight: 4
    }
  }), "Save Address"), savedAddresses.length > 0 && React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowAddAddressForm(false);
      setSelectedAddressId(savedAddresses[0]?.id || "");
    },
    style: {
      flex: 1,
      padding: "8px 12px",
      background: "rgba(87,31,41,.1)",
      color: "#571F29",
      borderRadius: 6,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 12,
      border: "none",
      cursor: "pointer"
    }
  }, "Cancel")), addressSaveStatus && React.createElement("div", {
    style: {
      marginTop: 8,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: addressSaveStatus.type === "ok" ? "#1E9E60" : "#C82828",
      fontWeight: 600
    }
  }, React.createElement("i", {
    className: `fa-solid ${addressSaveStatus.type === "ok" ? "fa-circle-check" : "fa-circle-xmark"}`,
    "aria-hidden": "true",
    style: {
      marginRight: 5
    }
  }), addressSaveStatus.message)), addressSaveStatus && !showAddAddressForm && React.createElement("div", {
    style: {
      marginBottom: 10,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: addressSaveStatus.type === "ok" ? "#1E9E60" : "#C82828",
      fontWeight: 600
    }
  }, React.createElement("i", {
    className: `fa-solid ${addressSaveStatus.type === "ok" ? "fa-circle-check" : "fa-circle-xmark"}`,
    "aria-hidden": "true",
    style: {
      marginRight: 5
    }
  }), addressSaveStatus.message), !showAddAddressForm && (!activeUser?.id || selectedAddressId === "") && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "checkout-address-grid"
  }, React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("select", {
    style: {
      ...field,
      appearance: "none",
      WebkitAppearance: "none",
      paddingRight: 30,
      cursor: "pointer",
      color: city ? "#1A0A0D" : "rgba(26,10,13,.38)"
    },
    value: city,
    onChange: e => {
      setCity(e.target.value);
      setArea("");
    },
    required: !activeUser?.id || selectedAddressId === "",
    disabled: isBusy
  }, React.createElement("option", {
    value: "",
    disabled: true
  }, "City *"), Object.keys(BD_AREAS).sort().map(c => React.createElement("option", {
    key: c,
    value: c
  }, c))), React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 10,
      color: "rgba(87,31,41,.45)",
      pointerEvents: "none"
    }
  })), React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("select", {
    style: {
      ...field,
      appearance: "none",
      WebkitAppearance: "none",
      paddingRight: 30,
      cursor: city ? "pointer" : "not-allowed",
      color: area ? "#1A0A0D" : "rgba(26,10,13,.38)",
      opacity: city ? 1 : 0.55
    },
    value: area,
    onChange: e => setArea(e.target.value),
    required: !activeUser?.id || selectedAddressId === "",
    disabled: !city || isBusy
  }, React.createElement("option", {
    value: ""
  }, city ? "Select area *" : "District/Area *"), (BD_AREAS[city] || []).map(a => React.createElement("option", {
    key: a,
    value: a
  }, a))), React.createElement("i", {
    className: "fa-solid fa-chevron-down",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 10,
      color: "rgba(87,31,41,.45)",
      pointerEvents: "none"
    }
  }))), React.createElement("input", {
    style: field,
    type: "text",
    placeholder: "House no., road, block, building\u2026",
    value: street,
    onChange: e => setStreet(e.target.value),
    required: !activeUser?.id || selectedAddressId === "",
    disabled: isBusy
  })))), React.createElement("button", {
    type: "submit",
    disabled: step === "details" ? !canSubmitDetails : !canSubmitPhone,
    style: primBtn(step === "details" ? !canSubmitDetails : !canSubmitPhone),
    "aria-label": step === "details" ? `${paymentMethod === "bkash" ? "Confirm bKash order" : "Place order"} for ৳${effectiveFinalTotal.toLocaleString()}` : undefined
  }, isBusy ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    "aria-hidden": "true"
  }), " ", step === "details" ? "Placing Order…" : "Checking…") : step === "details" ? React.createElement(React.Fragment, null, React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 20 20",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M16.5 5.5 8.1 13.9 3.8 9.6",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), paymentMethod === "bkash" ? `Confirm bKash Order — ৳${effectiveFinalTotal.toLocaleString()}` : `Place Order — ৳${effectiveFinalTotal.toLocaleString()}`) : guestTrustedDevice ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-arrow-right-long",
    "aria-hidden": "true"
  }), " Continue") : phoneChecking ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    "aria-hidden": "true"
  }), " Checking Number\u2026") : guestNeedsOtp ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-mobile-screen-button",
    "aria-hidden": "true"
  }), " Send Verification Code") : React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-arrow-right-long",
    "aria-hidden": "true"
  }), " Continue")), React.createElement("p", {
    style: {
      margin: "0",
      fontSize: 11.5,
      color: "#999",
      fontFamily: "var(--font-body)",
      textAlign: "center"
    }
  }, step === "details" ? paymentMethod === "bkash" ? "bKash payment · No COD charge · Order confirmed after verification" : "Cash on delivery · Delivery and 1% COD charge included" : phoneChecking ? "Cash on delivery · Checking this phone number" : guestNeedsOtp ? "Cash on delivery · A code will be sent to your number" : "Cash on delivery · Enter your phone number to continue"))));
}
function BuySheet({
  open,
  onClose,
  qty,
  setQty,
  coupon,
  setCoupon,
  couponStatus,
  setCouponStatus,
  couponError,
  discount,
  verifyCoupon,
  addToCart,
  addedAnim,
  product,
  onBuyNow,
  onCreateAccount
}) {
  var pricing = calculateProductPricing(product, qty);
  var totalPrice = Math.max(0, pricing.productSubtotal - discount);
  var showOldPrice = pricing.productDiscountTotal > 0 || discount > 0;
  var productDiscounted = hasProductDiscount(product);
  var discountCapMessage = getDiscountCapMessage(product, qty);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return React.createElement("div", {
    className: "buy-sheet-overlay",
    onClick: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    className: "buy-sheet"
  }, React.createElement("div", {
    className: "buy-sheet-handle"
  }), React.createElement("div", {
    className: "buy-sheet-header"
  }, React.createElement("div", null, React.createElement("div", {
    className: "buy-sheet-product-name",
    style: {
      fontSize: 17,
      fontWeight: 800,
      fontFamily: "var(--font-display)",
      color: "#571F29",
      marginBottom: 4
    }
  }, product.name, " -  ", product.weight), React.createElement("div", {
    className: "buy-sheet-price",
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      fontSize: 26,
      fontWeight: 900,
      fontFamily: "var(--font-display)",
      color: "#C97C00"
    }
  }, React.createElement("span", null, "\u09F3", totalPrice.toLocaleString()), showOldPrice && React.createElement("span", {
    style: {
      fontSize: 14,
      color: "rgba(87,31,41,0.4)",
      textDecoration: "line-through"
    }
  }, "\u09F3", pricing.originalSubtotal.toLocaleString()))), React.createElement("button", {
    className: "buy-sheet-close",
    onClick: onClose,
    "aria-label": "Close",
    style: {
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
      flexShrink: 0
    }
  }, "\xD7")), discountCapMessage && React.createElement("div", {
    style: {
      background: "rgba(255,145,0,0.08)",
      border: "1px solid rgba(255,145,0,0.28)",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, React.createElement("span", {
    style: {
      background: "#FF9100",
      color: "#fff",
      fontSize: 11,
      fontWeight: 800,
      padding: "3px 9px",
      borderRadius: 20,
      whiteSpace: "nowrap",
      flexShrink: 0,
      marginTop: 1
    }
  }, product.discountLabel || `৳${pricing.productDiscountTotal.toLocaleString()} OFF`), React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "#7A4800",
      lineHeight: 1.45,
      fontFamily: "var(--font-body)"
    }
  }, discountCapMessage)), productDiscounted ? React.createElement("div", {
    className: "shop-coupon-disabled",
    style: {
      background: "rgba(87,31,41,0.05)",
      border: "1px solid rgba(87,31,41,0.12)",
      borderRadius: 10,
      padding: "10px 14px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info",
    "aria-hidden": "true",
    style: {
      color: "rgba(87,31,41,0.4)",
      fontSize: 15,
      flexShrink: 0,
      marginTop: 1
    }
  }), React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "rgba(87,31,41,0.65)",
      lineHeight: 1.45,
      fontFamily: "var(--font-body)"
    }
  }, "Enter your phone number first. If this offer is not available for your number, you can apply a coupon at checkout.")) : React.createElement("div", {
    className: "shop-coupon-row"
  }, React.createElement("div", {
    className: "shop-coupon-wrap",
    style: {
      flexDirection: "row",
      borderRadius: 8
    }
  }, React.createElement("input", {
    className: "shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : ""),
    type: "text",
    placeholder: "Enter coupon code",
    value: coupon,
    onChange: e => {
      setCoupon(e.target.value.toUpperCase());
      setCouponStatus("idle");
    },
    onKeyDown: e => e.key === "Enter" && verifyCoupon(),
    "aria-label": "Coupon code"
  }), React.createElement("button", {
    className: "shop-coupon-btn",
    onClick: verifyCoupon,
    style: {
      borderRadius: 0,
      padding: "0 18px"
    }
  }, "Verify")), couponStatus === "ok" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--ok"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), " Coupon applied - \u09F3", discount, " off"), couponStatus === "err" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--err"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    "aria-hidden": "true"
  }), " ", couponError)), React.createElement("div", {
    className: "shop-qty-row",
    style: {
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 0
    }
  }, React.createElement("div", {
    className: "shop-qty",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: "none",
      borderRadius: 0,
      overflow: "visible",
      background: "transparent"
    }
  }, React.createElement("button", {
    className: "shop-qty-btn",
    onClick: () => setQty(q => Math.max(1, q - 1)),
    "aria-label": "Decrease quantity",
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "rgba(87,31,41,0.08)",
      color: "#571F29",
      fontSize: 20,
      border: "none",
      cursor: "pointer"
    }
  }, "\u2212"), React.createElement("span", {
    className: "shop-qty-val",
    style: {
      minWidth: 36,
      width: "auto",
      textAlign: "center",
      fontSize: 17,
      fontWeight: 800,
      fontFamily: "var(--font-display)",
      color: "#571F29",
      lineHeight: 1,
      borderLeft: "none",
      borderRight: "none"
    }
  }, qty), React.createElement("button", {
    className: "shop-qty-btn",
    onClick: () => setQty(q => q + 1),
    "aria-label": "Increase quantity",
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "rgba(87,31,41,0.08)",
      color: "#571F29",
      fontSize: 20,
      border: "none",
      cursor: "pointer"
    }
  }, "+")), React.createElement("button", {
    className: "shop-add-btn",
    onClick: onBuyNow,
    style: {
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
      gap: 8
    }
  }, React.createElement("i", {
    className: "fa-solid fa-bag-shopping",
    "aria-hidden": "true",
    style: {
      fontSize: 14
    }
  }), "Order Now")), React.createElement("div", {
    className: "shop-member-note shop-member-note--sheet",
    style: {
      background: "rgba(255,145,0,0.06)",
      border: "1px solid rgba(255,145,0,0.2)",
      borderRadius: 12,
      padding: "12px 14px",
      display: "block",
      marginTop: 0,
      gap: 0
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      minWidth: 0
    }
  }, React.createElement("i", {
    className: "fa-solid fa-star",
    "aria-hidden": "true",
    style: {
      color: "#FF9100",
      fontSize: 13,
      flexShrink: 0,
      marginTop: 2
    }
  }), React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#571F29",
      fontFamily: "var(--font-display)",
      flex: 1,
      minWidth: 0,
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      lineHeight: 1.35
    }
  }, "Save your address. Track your order. Earn points.")), React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "rgba(87,31,41,0.6)",
      lineHeight: 1.45,
      marginTop: 5,
      flex: "none"
    }
  }, "Create an account and earn points from this order. Save your address, track your pouch, and reorder faster next time."), React.createElement("button", {
    className: "shop-member-note-cta",
    onClick: () => {
      onClose();
      onCreateAccount?.();
    },
    style: {
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
      boxSizing: "border-box"
    }
  }, "Join the Midnight Circle"))));
}
var REVIEW_TAG_LABELS = {
  taste: "Taste",
  aroma: "Aroma",
  easy_to_make: "Easy to make",
  energy_focus: "Energy / Focus",
  packaging: "Packaging",
  delivery: "Delivery"
};
var REVIEW_AVATAR_COLORS = ["#7B2D38", "#B84A1A", "#5E3A1E", "#2B5C30", "#1A4D6E", "#6A3D72"];
function reviewAvatarColor(name) {
  var h = 0;
  for (var i = 0; i < (name || "").length; i++) h = h * 31 + name.charCodeAt(i) & 0xfffff;
  return REVIEW_AVATAR_COLORS[h % REVIEW_AVATAR_COLORS.length];
}
function ReviewsSection({
  productSlug = "midnight-blend",
  onStats,
  loggedIn,
  onSignIn,
  onOrderNow
}) {
  var isMobile = useIsMobile();
  var [reviews, setReviews] = useState([]);
  var [total, setTotal] = useState(0);
  var [avgRating, setAvgRating] = useState(0);
  var [topTags, setTopTags] = useState([]);
  var [page, setPage] = useState(1);
  var [loading, setLoading] = useState(true);
  var [lockedOpen, setLockedOpen] = useState(false);
  var [reviewTrigger, setReviewTrigger] = useState(0);
  var [reviewOrderId, setReviewOrderId] = useState(null);
  var [reviewNotice, setReviewNotice] = useState("");
  var LIMIT = 6;
  var fetchReviews = async (p = 1) => {
    setLoading(true);
    try {
      var res = await fetch(`${API_BASE}/reviews?product=${productSlug}&page=${p}&limit=${LIMIT}`);
      var json = await res.json();
      if (!json?.ok) return;
      var nextReviews = json.data?.reviews || [];
      setReviews(prev => p === 1 ? nextReviews : [...prev, ...nextReviews]);
      setTotal(json.data?.total || 0);
      setAvgRating(json.data?.avg_rating || 0);
      setTopTags(json.data?.top_tags || []);
      setPage(p);
      onStats?.({
        rating: json.data?.avg_rating || 0,
        count: json.data?.total || 0
      });
    } catch {} finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchReviews(1);
  }, [productSlug]);
  var fmtMonth = dateStr => dateStr ? new Date(dateStr).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  }) : "";
  var tagChip = (tag, key, active) => React.createElement("span", {
    key: key,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: active ? "7px 14px" : "4px 11px",
      borderRadius: 999,
      background: active ? "rgba(255,145,0,.1)" : "rgba(87,31,41,.06)",
      border: `1px solid ${active ? "rgba(255,145,0,.45)" : "rgba(87,31,41,.12)"}`,
      fontFamily: "var(--font-body)",
      fontSize: active ? 12.5 : 11.5,
      fontWeight: 700,
      color: active ? "#571F29" : "rgba(87,31,41,.65)",
      whiteSpace: "nowrap"
    }
  }, REVIEW_TAG_LABELS[tag] || tag);
  var hasMore = reviews.length < total;
  var reviewIntentKey = `mp_review_intent_${productSlug}`;
  var openReviewCta = async () => {
    setReviewNotice("");
    if (!loggedIn) {
      localStorage.setItem(reviewIntentKey, "1");
      onSignIn?.();
      return;
    }
    try {
      var q = new URLSearchParams({
        prompt: "false",
        product: productSlug
      });
      var res = await fetch(`${API_BASE}/reviews/eligibility?${q.toString()}`, {
        credentials: "include"
      });
      var json = await res.json();
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
  var reviewCta = React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: isMobile ? "flex-start" : "flex-end",
      gap: 7
    }
  }, React.createElement("button", {
    type: "button",
    onClick: openReviewCta,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "11px 20px",
      minHeight: 44,
      borderRadius: 14,
      background: "rgba(255,145,0,.12)",
      border: "1.5px solid rgba(255,145,0,.58)",
      color: "#571F29",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer",
      boxShadow: "0 8px 22px rgba(87,31,41,.08)",
      transition: "transform .15s, box-shadow .15s, background .15s"
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = "0 12px 26px rgba(255,145,0,.18)";
      e.currentTarget.style.background = "rgba(255,145,0,.18)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "0 8px 22px rgba(87,31,41,.08)";
      e.currentTarget.style.background = "rgba(255,145,0,.12)";
    }
  }, React.createElement("i", {
    className: "fa-solid fa-pen-nib",
    "aria-hidden": "true"
  }), "Write a Review"), React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "rgba(87,31,41,.52)",
      maxWidth: 300,
      lineHeight: 1.45,
      textAlign: isMobile ? "left" : "right"
    }
  }, "Order first, then share your experience as a verified customer."));
  return React.createElement("section", {
    id: "reviews-section",
    style: {
      borderTop: "1px solid rgba(87,31,41,.1)",
      marginTop: 36
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 900,
      margin: "0 auto",
      padding: "40px 24px 64px"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 18,
      flexWrap: "wrap",
      gap: 16
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      fontSize: 48,
      lineHeight: 1,
      color: "#571F29"
    }
  }, avgRating > 0 ? avgRating : "–"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      justifyContent: "center",
      marginTop: 4
    }
  }, [1, 2, 3, 4, 5].map(i => React.createElement(Star, {
    key: i,
    size: 14,
    filled: i <= Math.round(avgRating)
  })))), React.createElement("div", {
    style: {
      width: 1,
      height: 52,
      background: "rgba(87,31,41,.15)"
    }
  }), React.createElement("div", null, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 18,
      color: "#571F29",
      marginBottom: 2
    }
  }, "Customer Reviews"), React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "rgba(87,31,41,.55)"
    }
  }, "Based on ", total.toLocaleString(), " verified purchase", total === 1 ? "" : "s"))), !isMobile && reviewCta), topTags.length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 26
    }
  }, React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".07em",
      textTransform: "uppercase",
      color: "rgba(87,31,41,.45)"
    }
  }, "Most mentioned"), topTags.map(t => tagChip(t.tag, t.tag, true))), isMobile && React.createElement("div", {
    style: {
      marginBottom: 22
    }
  }, reviewCta), reviewNotice && React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 22,
      padding: "10px 14px",
      borderRadius: 12,
      background: "rgba(76,175,132,.1)",
      border: "1px solid rgba(76,175,132,.22)",
      color: "#2E7D4F",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 700
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), reviewNotice), loading && reviews.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "36px 0",
      color: "rgba(87,31,41,.4)",
      fontFamily: "var(--font-body)",
      fontSize: 13
    }
  }, React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    style: {
      marginRight: 8
    },
    "aria-hidden": "true"
  }), "Loading reviews\u2026") : reviews.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 0"
    }
  }, React.createElement("i", {
    className: "fa-regular fa-comment-dots",
    style: {
      fontSize: 32,
      color: "rgba(87,31,41,.2)",
      display: "block",
      marginBottom: 12
    },
    "aria-hidden": "true"
  }), React.createElement("p", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 14,
      color: "rgba(87,31,41,.5)",
      margin: "0 0 4px"
    }
  }, "No reviews yet"), React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "rgba(87,31,41,.4)",
      margin: 0
    }
  }, "Reviews open once members receive their coffee.")) : React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 14
    }
  }, reviews.map(r => React.createElement("div", {
    key: r.id,
    style: {
      background: "rgba(255,255,255,.55)",
      backdropFilter: "blur(6px)",
      borderRadius: 16,
      padding: "18px 20px",
      border: "1px solid rgba(87,31,41,.1)",
      boxShadow: "0 2px 12px rgba(87,31,41,.05)",
      display: "flex",
      flexDirection: "column"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 2
    }
  }, [1, 2, 3, 4, 5].map(i => React.createElement(Star, {
    key: i,
    size: 14,
    filled: i <= r.rating
  }))), React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "rgba(87,31,41,.4)",
      whiteSpace: "nowrap"
    }
  }, fmtMonth(r.created_at))), r.comment && React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13.5,
      color: "rgba(44,24,16,.82)",
      margin: "0 0 12px",
      lineHeight: 1.65
    }
  }, "\u201C", r.comment, "\u201D"), r.highlight_tags?.length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12
    }
  }, r.highlight_tags.map((t, i) => tagChip(t, i, false))), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: "auto"
    }
  }, React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: reviewAvatarColor(r.display_name || "M"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 14,
      flexShrink: 0
    }
  }, (r.display_name || "M").charAt(0).toUpperCase()), React.createElement("div", null, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 13.5,
      color: "#571F29"
    }
  }, r.display_name || "Verified Customer"), r.is_verified && React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "var(--font-body)",
      fontSize: 11,
      fontWeight: 700,
      color: "#2E7D4F"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      fontSize: 11
    },
    "aria-hidden": "true"
  }), "Verified Purchase")))))), hasMore && React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 20
    }
  }, React.createElement("button", {
    onClick: () => fetchReviews(page + 1),
    disabled: loading,
    style: {
      padding: "11px 32px",
      background: "none",
      color: "#571F29",
      borderRadius: 10,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 13,
      border: "1.5px solid rgba(87,31,41,.22)",
      cursor: "pointer"
    }
  }, loading ? "Loading…" : `Load more · ${total - reviews.length} remaining`)))), lockedOpen && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1320,
      background: "rgba(33,16,13,.48)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    onClick: e => e.target === e.currentTarget && setLockedOpen(false),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Unlock verified reviews"
  }, React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 430,
      borderRadius: 24,
      background: "#FFFDF7",
      border: "1px solid rgba(87,31,41,.12)",
      boxShadow: "0 28px 80px rgba(58,31,26,.32)",
      padding: "28px 26px 24px",
      position: "relative",
      textAlign: "left"
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => setLockedOpen(false),
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      border: "none",
      borderRadius: 10,
      background: "rgba(44,24,16,.06)",
      color: "#2C1810",
      cursor: "pointer"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-xmark",
    "aria-hidden": "true"
  })), React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: "rgba(255,145,0,.14)",
      color: "#FF9100",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    }
  }, React.createElement("i", {
    className: "fa-solid fa-lock-open",
    "aria-hidden": "true"
  })), React.createElement("p", {
    style: {
      margin: "0 0 6px",
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "#FF9100"
    }
  }, "Verified reviews unlock after your first order"), React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      fontSize: 24,
      color: "#571F29",
      lineHeight: 1.15
    }
  }, "Unlock verified reviews"), React.createElement("p", {
    style: {
      margin: "0 0 20px",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "rgba(44,24,16,.65)",
      lineHeight: 1.6
    }
  }, "Place your first order to share your experience as a verified customer."), React.createElement("button", {
    type: "button",
    onClick: () => {
      setLockedOpen(false);
      onOrderNow?.();
    },
    style: {
      width: "100%",
      minHeight: 48,
      border: "none",
      borderRadius: 14,
      background: "#FF9100",
      color: "#2C1810",
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      fontSize: 15,
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(255,145,0,.28)"
    }
  }, "Order Now"), React.createElement("p", {
    style: {
      margin: "12px 0 0",
      textAlign: "center",
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "rgba(44,24,16,.48)",
      lineHeight: 1.5
    }
  }, "Your review will appear after delivery and approval."))), typeof MPReviewPrompt === "function" && React.createElement(MPReviewPrompt, {
    source: "shop_review_cta",
    manual: true,
    triggerKey: reviewTrigger,
    orderId: reviewOrderId,
    productSlug: productSlug
  }));
}
function ShopPage() {
  var [product, setProduct] = useState(PRODUCT_DEFAULT);
  var [productLoading, setProductLoading] = useState(true);
  var [activeImg, setActiveImg] = useState(0);
  var [imgKey, setImgKey] = useState(0);
  var [qty, setQty] = useState(1);
  var [coupon, setCoupon] = useState("");
  var [couponStatus, setCouponStatus] = useState("idle");
  var [couponError, setCouponError] = useState("");
  var [discount, setDiscount] = useState(0);
  var [cart, setCart] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("mp_cart") || "[]");
    } catch {
      return [];
    }
  });
  var [toasts, setToasts] = useState([]);
  var [addedAnim, setAddedAnim] = useState(false);
  var [authOpen, setAuthOpen] = useState(false);
  var [reviewAuthIntent, setReviewAuthIntent] = useState(false);
  var [shopAuth, setShopAuth] = useState(getShopAuthState);
  var handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("mp_user");
    setShopAuth({
      loggedIn: false,
      dashUrl: "dashboard-user.html",
      user: null
    });
  };
  var [buySheetOpen, setBuySheetOpen] = useState(false);
  var [orderModalOpen, setOrderModalOpen] = useState(false);
  var [reviewStats, setReviewStats] = useState({
    rating: 0,
    count: 0
  });
  var [couponOpen, setCouponOpen] = useState(false);
  useEffect(() => {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get('id');
    var url = pid ? `${API_BASE}/products/${pid}` : `${API_BASE}/products`;
    fetch(url).then(r => r.json()).then(data => {
      if (!data || !data.ok) return;
      var p = pid ? data.data : data.data && data.data.products && data.data.products[0];
      if (!p) return;
      var statusLower = (p.status || "active").toLowerCase();
      setProduct({
        id: p.id,
        name: p.name || "",
        price: Math.round(Number(p.sale_price || p.price || 0)),
        originalPrice: Math.round(Number(p.price || 0)),
        salePrice: Math.round(Number(p.sale_price || p.price || 0)),
        discountAmount: Math.round(Number(p.discount_amount || 0)),
        discountMaxQty: p.discount_max_qty || null,
        discountMaxOrders: p.discount_max_orders || null,
        discountBlocked: !!p.discount_blocked,
        discountLabel: p.discount_label || "",
        desc: p.description || "",
        weight: p.qty ? `${p.qty}${p.unit || 'g'}` : "",
        category: p.category || "",
        badge: p.badge || p.category || "",
        status: statusLower,
        inStock: statusLower !== "coming soon" && statusLower !== "stock out" && (p.stock === null || p.stock === undefined || p.stock > 0),
        roast: p.roast || "",
        origin: p.origin || "",
        blend: p.blend || "",
        process: p.process || "",
        images: Array.isArray(p.images) ? p.images : []
      });
      setActiveImg(0);
    }).catch(() => {}).finally(() => setProductLoading(false));
  }, []);
  useEffect(() => {
    sessionStorage.setItem("mp_cart", JSON.stringify(cart));
  }, [cart]);
  var pricing = calculateProductPricing(product, qty);
  var productDiscounted = hasProductDiscount(product);
  var discountCapMessage = getDiscountCapMessage(product, qty);
  var totalPrice = Math.max(0, pricing.productSubtotal - discount);
  useEffect(() => {
    if (!productDiscounted) return;
    setCoupon("");
    setCouponStatus("idle");
    setCouponError("");
    setDiscount(0);
    setCouponOpen(false);
  }, [productDiscounted, product.id]);
  var switchImage = idx => {
    setActiveImg(idx);
    setImgKey(k => k + 1);
  };
  var verifyCoupon = async () => {
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
      var subtotal = pricing.productSubtotal;
      var res = await fetch(`${API_BASE}/coupons/verify?code=${encodeURIComponent(coupon.trim())}&subtotal=${subtotal}${product.id && !product.discountBlocked ? `&product_id=${encodeURIComponent(product.id)}` : ""}`, {
        credentials: "include"
      });
      var json = await res.json();
      if (!res.ok) {
        setDiscount(0);
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
  var addToCart = () => {
    var item = {
      id: product.id || "blend",
      name: product.name,
      price: totalPrice / qty,
      qty
    };
    setCart(c => [...c, item]);
    var id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, {
      id,
      name: `${product.name}${product.weight ? ' -  ' + product.weight : ''}`
    }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2200);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };
  var openOrderModal = () => {
    setBuySheetOpen(false);
    setOrderModalOpen(true);
  };
  var buyNow = () => {
    if (product.status === "coming soon" || product.status === "stock out") return;
    if (window.innerWidth <= 640) {
      setBuySheetOpen(true);
    } else {
      setOrderModalOpen(true);
    }
  };
  if (productLoading) {
    return React.createElement("div", {
      className: "shop-page"
    }, React.createElement(ShopHeader, {
      onSignIn: () => {
        setReviewAuthIntent(false);
        setAuthOpen(true);
      },
      loggedIn: shopAuth.loggedIn,
      dashUrl: shopAuth.dashUrl,
      onLogout: handleLogout
    }), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        flexDirection: "column",
        gap: 16
      }
    }, React.createElement("div", {
      className: "loader",
      "aria-label": "Loading product",
      role: "status"
    }, React.createElement("div", {
      className: "cup"
    }, React.createElement("div", {
      className: "cup-handle"
    }), React.createElement("div", {
      className: "smoke one"
    }), React.createElement("div", {
      className: "smoke two"
    }), React.createElement("div", {
      className: "smoke three"
    })), React.createElement("div", {
      className: "load"
    }, "Loading product\u2026"))));
  }
  return React.createElement("div", {
    className: "shop-page"
  }, React.createElement(ShopHeader, {
    onSignIn: () => {
      setReviewAuthIntent(false);
      setAuthOpen(true);
    },
    productName: product.name,
    loggedIn: shopAuth.loggedIn,
    dashUrl: shopAuth.dashUrl,
    onLogout: handleLogout
  }), React.createElement("div", {
    className: "shop-layout"
  }, React.createElement("div", {
    className: "shop-visual"
  }, React.createElement("div", {
    className: "shop-img-card"
  }, React.createElement("div", {
    className: "shop-img-wrapper"
  }, product.images.length > 0 ? React.createElement("img", {
    key: imgKey,
    src: product.images[activeImg],
    alt: `${product.name} -  image ${activeImg + 1}`,
    className: "shop-main-img",
    loading: "eager",
    decoding: "async"
  }) : React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      minHeight: 280,
      color: "rgba(87,31,41,.2)"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-image",
    style: {
      fontSize: 56
    },
    "aria-hidden": "true"
  }))), product.images.length > 1 && React.createElement("div", {
    className: "shop-thumbs"
  }, product.images.map((src, i) => React.createElement("button", {
    key: i,
    className: "shop-thumb" + (activeImg === i ? " active" : ""),
    onClick: () => switchImage(i),
    "aria-label": `View ${THUMB_LABELS[i] ?? `image ${i + 1}`}`
  }, React.createElement(LazyImage, {
    src: src,
    alt: THUMB_LABELS[i] ?? `Image ${i + 1}`,
    style: {
      width: '100%',
      height: '100%'
    }
  }), React.createElement("span", {
    className: "shop-thumb-label"
  }, THUMB_LABELS[i] ?? String(i + 1))))))), React.createElement("div", {
    className: "shop-info"
  }, product.category && React.createElement("div", {
    className: "shop-category"
  }, product.category), React.createElement("div", {
    className: "shop-name-row"
  }, React.createElement("h1", {
    className: "shop-name"
  }, product.name), product.status === "coming soon" ? React.createElement("span", {
    className: "shop-stock-badge",
    style: {
      background: "rgba(255,145,0,.15)",
      color: "#b36200",
      border: "1px solid rgba(255,145,0,.35)"
    }
  }, "Coming Soon") : product.status === "stock out" ? React.createElement("span", {
    className: "shop-stock-badge",
    style: {
      background: "rgba(200,40,40,.1)",
      color: "#c82828",
      border: "1px solid rgba(200,40,40,.25)"
    }
  }, "Out of Stock") : product.inStock ? React.createElement("span", {
    className: "shop-stock-badge"
  }, "In Stock") : null), reviewStats.rating > 0 && React.createElement(ShopStarRating, {
    rating: reviewStats.rating,
    reviews: reviewStats.count
  }), React.createElement("div", {
    className: "shop-price-row"
  }, React.createElement("span", {
    className: "shop-price"
  }, "\u09F3", totalPrice.toLocaleString()), (pricing.productDiscountTotal > 0 || discount > 0) && React.createElement(React.Fragment, null, React.createElement("span", {
    className: "shop-old-price"
  }, "\u09F3", pricing.originalSubtotal.toLocaleString()), pricing.productDiscountTotal > 0 && React.createElement("span", {
    className: "shop-save-badge"
  }, product.discountLabel || `Save ৳${pricing.productDiscountTotal.toLocaleString()}`), discount > 0 && React.createElement("span", {
    className: "shop-save-badge shop-save-badge--coupon"
  }, "Coupon Applied"))), pricing.productDiscountTotal > 0 && discountCapMessage && React.createElement("div", {
    className: "shop-product-offer-note",
    style: {
      color: qty > Number(product.discountMaxQty || 0) ? "#B36A00" : undefined
    }
  }, getDiscountCapMessage(product, qty)), React.createElement("p", {
    className: "shop-desc"
  }, product.desc), (product.roast || product.origin || product.blend || product.process || product.weight) && React.createElement("div", {
    className: "shop-specs"
  }, product.roast && React.createElement("div", {
    className: "shop-spec"
  }, React.createElement("span", null, "Roast"), React.createElement("strong", null, product.roast)), product.origin && React.createElement("div", {
    className: "shop-spec"
  }, React.createElement("span", null, "Origin"), React.createElement("strong", null, product.origin)), product.blend && React.createElement("div", {
    className: "shop-spec"
  }, React.createElement("span", null, "Blend"), React.createElement("strong", null, product.blend)), product.process && React.createElement("div", {
    className: "shop-spec"
  }, React.createElement("span", null, "Process"), React.createElement("strong", null, product.process)), product.weight && React.createElement("div", {
    className: "shop-spec shop-spec--full"
  }, React.createElement("span", null, "Weight"), React.createElement("strong", null, product.weight))), React.createElement("div", {
    className: "shop-inline-controls"
  }, React.createElement("p", {
    className: "shop-qty-label"
  }, "Quantity"), React.createElement("div", {
    className: "shop-qty-row"
  }, React.createElement("div", {
    className: "shop-qty"
  }, React.createElement("button", {
    className: "shop-qty-btn",
    onClick: () => setQty(q => Math.max(1, q - 1)),
    "aria-label": "Decrease quantity"
  }, "\u2212"), React.createElement("span", {
    className: "shop-qty-val"
  }, qty), React.createElement("button", {
    className: "shop-qty-btn",
    onClick: () => setQty(q => q + 1),
    "aria-label": "Increase quantity"
  }, "+")), product.status === "coming soon" || product.status === "stock out" ? React.createElement("button", {
    className: "shop-buy-btn",
    disabled: true,
    style: {
      opacity: 0.45,
      cursor: "not-allowed"
    }
  }, product.status === "coming soon" ? "Coming Soon" : "Out of Stock") : React.createElement("button", {
    className: "shop-buy-btn",
    onClick: buyNow
  }, React.createElement("i", {
    className: "fa-solid fa-bag-shopping",
    "aria-hidden": "true"
  }), "Order Now")), React.createElement("div", {
    className: "shop-member-note"
  }, React.createElement("i", {
    className: "fa-solid fa-star",
    "aria-hidden": "true"
  }), React.createElement("span", null, "Create an account and earn points from this order. Save your address, track your pouch, and reorder faster next time."))), React.createElement("div", {
    className: "shop-trust-row"
  }, React.createElement("span", {
    className: "shop-trust-chip"
  }, React.createElement("i", {
    className: "fa-solid fa-motorcycle",
    "aria-hidden": "true"
  }), " Cash on Delivery"), React.createElement("span", {
    className: "shop-trust-chip"
  }, React.createElement("i", {
    className: "fa-solid fa-truck-fast",
    "aria-hidden": "true"
  }), " 1\u20132 Day Delivery"), React.createElement("span", {
    className: "shop-trust-chip"
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    "aria-hidden": "true"
  }), " Sealed Pack")), productDiscounted ? React.createElement("div", {
    className: "shop-coupon-disabled"
  }, React.createElement("i", {
    className: "fa-solid fa-mobile-screen-button",
    "aria-hidden": "true"
  }), "Enter your phone number first. If this offer is not available for your number, you can apply a coupon at checkout.") : React.createElement(React.Fragment, null, React.createElement("button", {
    className: "shop-coupon-toggle",
    onClick: () => setCouponOpen(c => !c),
    "aria-expanded": couponOpen
  }, React.createElement("i", {
    className: "fa-solid fa-tag",
    "aria-hidden": "true"
  }), "Have a coupon?", React.createElement("i", {
    className: `fa-solid fa-chevron-${couponOpen ? "up" : "down"}`,
    "aria-hidden": "true"
  })), couponOpen && React.createElement("div", {
    className: "shop-coupon-row"
  }, React.createElement("div", {
    className: "shop-coupon-wrap"
  }, React.createElement("input", {
    className: "shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : ""),
    type: "text",
    placeholder: "Enter coupon code",
    value: coupon,
    onChange: e => {
      setCoupon(e.target.value.toUpperCase());
      setCouponStatus("idle");
    },
    onKeyDown: e => e.key === "Enter" && verifyCoupon(),
    "aria-label": "Coupon code"
  }), React.createElement("button", {
    className: "shop-coupon-btn",
    onClick: verifyCoupon,
    disabled: couponStatus === "loading"
  }, couponStatus === "loading" ? React.createElement("i", {
    className: "fa-solid fa-spinner fa-spin",
    "aria-hidden": "true"
  }) : "Apply")), couponStatus === "ok" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--ok"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), " Coupon applied \u2014 \u09F3", discount, " off"), couponStatus === "err" && React.createElement("span", {
    className: "shop-coupon-msg shop-coupon-msg--err"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    "aria-hidden": "true"
  }), " ", couponError))))), React.createElement(ReviewsSection, {
    productSlug: "midnight-blend",
    onStats: setReviewStats,
    loggedIn: shopAuth.loggedIn,
    onSignIn: () => {
      setReviewAuthIntent(true);
      setAuthOpen(true);
    },
    onOrderNow: buyNow
  }), React.createElement("div", {
    className: "shop-sticky-cta"
  }, React.createElement("div", {
    className: "shop-sticky-cta-left"
  }, React.createElement("span", {
    className: "shop-sticky-price"
  }, "\u09F3", totalPrice.toLocaleString()), (pricing.productDiscountTotal > 0 || discount > 0) && React.createElement("span", {
    className: "shop-sticky-old"
  }, "\u09F3", pricing.originalSubtotal.toLocaleString())), React.createElement("button", {
    className: "shop-sticky-cta-btn",
    onClick: buyNow,
    disabled: product.status === "coming soon" || product.status === "stock out"
  }, product.status === "coming soon" ? "Coming Soon" : product.status === "stock out" ? "Out of Stock" : "Order Now")), React.createElement(ShopToastStack, {
    toasts: toasts
  }), typeof MPReviewPrompt === "function" && React.createElement(MPReviewPrompt, {
    source: "site_revisit",
    suppress: orderModalOpen || buySheetOpen || authOpen,
    productSlug: "midnight-blend"
  }), React.createElement(AuthModal, {
    open: authOpen,
    onClose: () => setAuthOpen(false),
    title: "Join the Midnight Circle",
    subtitle: reviewAuthIntent ? "Create your account to order, collect Midnight Points, and share a verified review later." : "Track orders, collect Midnight Points, reorder faster, and manage your monthly coffee plan.",
    postAuthRedirect: reviewAuthIntent ? `${window.location.href.split("#")[0]}#reviews-section` : null
  }), React.createElement(BuySheet, {
    open: buySheetOpen,
    onClose: () => setBuySheetOpen(false),
    qty: qty,
    setQty: setQty,
    coupon: coupon,
    setCoupon: setCoupon,
    couponStatus: couponStatus,
    setCouponStatus: setCouponStatus,
    couponError: couponError,
    discount: discount,
    verifyCoupon: verifyCoupon,
    addToCart: addToCart,
    addedAnim: addedAnim,
    product: product,
    onBuyNow: openOrderModal,
    onCreateAccount: () => setAuthOpen(true)
  }), React.createElement(OrderModal, {
    open: orderModalOpen,
    onClose: () => setOrderModalOpen(false),
    product: product,
    qty: qty,
    discount: discount,
    setDiscount: setDiscount,
    coupon: coupon,
    setCoupon: setCoupon,
    couponStatus: couponStatus,
    setCouponStatus: setCouponStatus,
    couponError: couponError,
    setCouponError: setCouponError,
    loggedUser: shopAuth.user,
    onCreateAccount: () => setAuthOpen(true)
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ShopPage, null));
