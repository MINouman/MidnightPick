/* Built from components.jsx. Run: node scripts/build-jsx.js */
var Logo = ({
  variant = "light",
  height = 56
}) => React.createElement("img", {
  src: variant === "dark" ? "assets/logo-dark.png" : "assets/logo.png",
  alt: "Midnight Pick",
  style: {
    height,
    width: "auto",
    display: "block"
  }
});
function authApiErrorMessage(error, fallback) {
  if (error?.retry_after_seconds) {
    var minutes = Math.max(1, Math.ceil(error.retry_after_seconds / 60));
    return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return error?.message || fallback;
}
var CartIcon = ({
  size = 18
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("circle", {
  cx: "9",
  cy: "21",
  r: "1"
}), React.createElement("circle", {
  cx: "20",
  cy: "21",
  r: "1"
}), React.createElement("path", {
  d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
}));
var HeartIcon = ({
  size = 18
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("path", {
  d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
}));
var UserIcon = ({
  size = 18
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("path", {
  d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
}), React.createElement("circle", {
  cx: "12",
  cy: "7",
  r: "4"
}));
var ArrowRight = ({
  size = 16
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("line", {
  x1: "5",
  y1: "12",
  x2: "19",
  y2: "12"
}), React.createElement("polyline", {
  points: "12 5 19 12 12 19"
}));
var ArrowUpRight = ({
  size = 16
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className: "arrow"
}, React.createElement("line", {
  x1: "7",
  y1: "17",
  x2: "17",
  y2: "7"
}), React.createElement("polyline", {
  points: "7 7 17 7 17 17"
}));
var Plus = ({
  size = 14
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "3",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("line", {
  x1: "12",
  y1: "5",
  x2: "12",
  y2: "19"
}), React.createElement("line", {
  x1: "5",
  y1: "12",
  x2: "19",
  y2: "12"
}));
var Chev = ({
  size = 18
}) => React.createElement("svg", {
  className: "chev",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("polyline", {
  points: "6 9 12 15 18 9"
}));
var Check = ({
  size = 16,
  color = "currentColor"
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: "2.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, React.createElement("polyline", {
  points: "20 6 9 17 4 12"
}));
var MenuGridIcon = ({
  size = 22
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 22 22",
  fill: "currentColor",
  "aria-hidden": "true"
}, React.createElement("rect", {
  x: "1",
  y: "1",
  width: "9",
  height: "9",
  rx: "2.5"
}), React.createElement("rect", {
  x: "12",
  y: "1",
  width: "9",
  height: "9",
  rx: "2.5"
}), React.createElement("rect", {
  x: "1",
  y: "12",
  width: "9",
  height: "9",
  rx: "2.5"
}), React.createElement("rect", {
  x: "12",
  y: "12",
  width: "9",
  height: "9",
  rx: "2.5"
}));
var CloseIcon = ({
  size = 20
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.5",
  strokeLinecap: "round",
  "aria-hidden": "true"
}, React.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), React.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
}));
var Star = ({
  size = 14,
  filled = true
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: filled ? "currentColor" : "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  "aria-hidden": "true"
}, React.createElement("polygon", {
  points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
}));
var IconCoffeeSack = () => React.createElement("i", {
  className: "fa-solid fa-building-wheat",
  style: {
    fontSize: 48
  },
  "aria-hidden": "true"
});
var IconBullseye = () => React.createElement("i", {
  className: "fa-solid fa-bullseye",
  style: {
    fontSize: 48
  },
  "aria-hidden": "true"
});
var IconQualityBadge = () => React.createElement("i", {
  className: "fa-solid fa-award",
  style: {
    fontSize: 48
  },
  "aria-hidden": "true"
});
var StepPick = () => React.createElement("i", {
  className: "fa-solid fa-hand",
  style: {
    fontSize: 32
  },
  "aria-hidden": "true"
});
var StepSundry = () => React.createElement("i", {
  className: "fa-solid fa-sun",
  style: {
    fontSize: 32
  },
  "aria-hidden": "true"
});
var StepRoast = () => React.createElement("i", {
  className: "fa-solid fa-fire-flame-curved",
  style: {
    fontSize: 32
  },
  "aria-hidden": "true"
});
var StepGrind = () => React.createElement("i", {
  className: "fa-solid fa-snowflake",
  style: {
    fontSize: 32
  },
  "aria-hidden": "true"
});
var StepJar = () => React.createElement("i", {
  className: "fa-solid fa-box-open",
  style: {
    fontSize: 32
  },
  "aria-hidden": "true"
});
var SocialIcons = {
  x: React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement("path", {
    d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
  })),
  ig: React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "20",
    rx: "5"
  }), React.createElement("path", {
    d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"
  }), React.createElement("line", {
    x1: "17.5",
    y1: "6.5",
    x2: "17.51",
    y2: "6.5"
  })),
  fb: React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement("path", {
    d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  })),
  wa: React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement("path", {
    d: "M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
  }))
};
var SUBSCRIBE_PLANS = [{
  id: "nightshift",
  name: "Night Shift",
  badge: "POPULAR",
  contents: "10× Midnight Black sachets",
  regularPrice: 250,
  monthlyPrice: 210,
  bimonthlyPrice: 189,
  savings: "Save ৳40 · 16% off"
}, {
  id: "doubleshot",
  name: "Double Shot",
  badge: "BEST VALUE",
  contents: "10× Midnight Black + 10× Midnight Latte",
  regularPrice: 450,
  monthlyPrice: 370,
  bimonthlyPrice: 333,
  savings: "Save ৳80 · 18% off"
}];
function SubStepper({
  step
}) {
  return React.createElement("div", {
    className: "sub-stepper",
    role: "progressbar",
    "aria-valuenow": step,
    "aria-valuemin": 1,
    "aria-valuemax": 3
  }, [1, 2, 3].map((n, i) => React.createElement(React.Fragment, {
    key: n
  }, i > 0 && React.createElement("div", {
    className: "sub-step-line" + (step > i ? " done" : "")
  }), React.createElement("div", {
    className: "sub-step-dot" + (step === n ? " current" : step > n ? " done" : "")
  }, step > n ? React.createElement("svg", {
    width: "10",
    height: "10",
    viewBox: "0 0 12 12",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M2 6l3 3 5-5",
    stroke: "#fff",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : React.createElement("span", null, n)))));
}
function SubScreen1({
  plan,
  setPlan,
  freq,
  setFreq,
  onContinue,
  onClose
}) {
  var [priceVisible, setPriceVisible] = React.useState(true);
  var switchFreq = f => {
    if (f === freq) return;
    setPriceVisible(false);
    setTimeout(() => {
      setFreq(f);
      setPriceVisible(true);
    }, 150);
  };
  var getPrice = p => freq === "monthly" ? p.monthlyPrice : p.bimonthlyPrice;
  return React.createElement("div", {
    className: "sub-screen"
  }, React.createElement(SubStepper, {
    step: 1
  }), React.createElement("div", {
    className: "sub-eyebrow"
  }, "SUBSCRIBE"), React.createElement("h2", {
    className: "sub-title"
  }, "Your Monthly Midnight"), React.createElement("p", {
    className: "sub-subtitle"
  }, "Choose a plan. Cancel any time."), React.createElement("div", {
    className: "sub-freq-wrap"
  }, React.createElement("div", {
    className: "sub-freq-track"
  }, React.createElement("div", {
    className: "sub-freq-thumb" + (freq === "bimonthly" ? " right" : ""),
    "aria-hidden": "true"
  }), React.createElement("button", {
    className: "sub-freq-opt" + (freq === "monthly" ? " active" : ""),
    onClick: () => switchFreq("monthly")
  }, "Every month"), React.createElement("button", {
    className: "sub-freq-opt" + (freq === "bimonthly" ? " active" : ""),
    onClick: () => switchFreq("bimonthly")
  }, "Every 2 months"))), React.createElement("div", {
    className: "sub-plans"
  }, SUBSCRIBE_PLANS.map(p => React.createElement("button", {
    key: p.id,
    className: "sub-plan-card" + (plan === p.id ? " selected" : ""),
    onClick: () => setPlan(p.id)
  }, React.createElement("div", {
    className: "sub-plan-body"
  }, React.createElement("div", {
    className: "sub-plan-left"
  }, React.createElement("div", {
    className: "sub-plan-name-row"
  }, React.createElement("span", {
    className: "sub-plan-name"
  }, p.name), React.createElement("span", {
    className: "sub-plan-badge"
  }, p.badge)), React.createElement("div", {
    className: "sub-plan-contents"
  }, p.contents), React.createElement("div", {
    className: "sub-plan-savings"
  }, p.savings), freq === "bimonthly" && React.createElement("div", {
    className: "sub-plan-billed-note"
  }, "Billed every 2 months")), React.createElement("div", {
    className: "sub-plan-right"
  }, React.createElement("div", {
    className: "sub-plan-price-wrap" + (!priceVisible ? " price-fading" : "")
  }, React.createElement("span", {
    className: "sub-plan-price"
  }, "\u09F3", getPrice(p)), React.createElement("span", {
    className: "sub-plan-per"
  }, "/mo")), React.createElement("div", {
    className: "sub-plan-radio" + (plan === p.id ? " checked" : "")
  })))))), React.createElement("div", {
    className: "sub-perks"
  }, [{
    icon: "fa-truck-fast",
    text: "Priority delivery every month"
  }, {
    icon: "fa-gift",
    text: "Occasional free sachet included"
  }, {
    icon: "fa-xmark",
    text: "Cancel any time · no lock-in"
  }].map(perk => React.createElement("div", {
    className: "sub-perk",
    key: perk.icon
  }, React.createElement("div", {
    className: "sub-perk-icon"
  }, React.createElement("i", {
    className: `fa-solid ${perk.icon}`,
    "aria-hidden": "true"
  })), React.createElement("span", null, perk.text)))), React.createElement("button", {
    className: "sub-cta-btn",
    onClick: onContinue
  }, "Continue \u2192"), React.createElement("button", {
    className: "sub-ghost-link",
    onClick: onClose
  }, "One-time purchase instead? \u2191 Back to shop"));
}
function SubScreen2({
  plan,
  freq,
  form,
  setForm,
  onContinue,
  onBack
}) {
  var [errors, setErrors] = React.useState({});
  var [attempted, setAttempted] = React.useState(false);
  var [createAccount, setCreateAccount] = React.useState(true);
  var [returningUser, setReturningUser] = React.useState(false);
  var selectedPlan = SUBSCRIBE_PLANS.find(p => p.id === plan);
  var price = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;
  var validate = f => {
    var e = {};
    if (!f.name?.trim()) e.name = "Full name is required.";
    if (!f.phone?.trim()) e.phone = "Phone number is required.";
    if (!f.address?.trim()) e.address = "Delivery address is required.";
    if (!f.area?.trim()) e.area = "Area is required.";
    if (!f.city?.trim()) e.city = "City is required.";
    return e;
  };
  var handleContinue = () => {
    setAttempted(true);
    var e = validate(form);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onContinue();
  };
  var handleBlur = field => {
    if (!attempted) return;
    var e = validate(form);
    setErrors(prev => ({
      ...prev,
      [field]: e[field]
    }));
  };
  var handlePhoneBlur = () => {
    handleBlur("phone");
    if (form.phone?.startsWith("01711") && !returningUser) {
      setReturningUser(true);
      setForm(prev => ({
        ...prev,
        name: "Muzahidul Islam",
        address: "House 12, Road 4, Aftabnagar",
        area: "Badda",
        city: "Dhaka"
      }));
    }
  };
  var set = field => e => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (errors[field]) setErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
  };
  return React.createElement("div", {
    className: "sub-screen"
  }, React.createElement(SubStepper, {
    step: 2
  }), React.createElement("h2", {
    className: "sub-title"
  }, "Delivery Details"), React.createElement("p", {
    className: "sub-subtitle"
  }, "Where should we send your monthly coffee?"), React.createElement("div", {
    className: "sub-recap-bar"
  }, React.createElement("div", null, React.createElement("div", {
    className: "sub-recap-plan"
  }, selectedPlan.name.toUpperCase(), " PLAN"), React.createElement("div", {
    className: "sub-recap-detail"
  }, selectedPlan.contents, " \xB7 \u09F3", price, "/mo")), React.createElement("button", {
    className: "sub-recap-edit",
    onClick: onBack,
    "aria-label": "Edit plan"
  }, React.createElement("i", {
    className: "fa-solid fa-pencil",
    "aria-hidden": "true"
  }))), returningUser && React.createElement("div", {
    className: "sub-returning-banner"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), React.createElement("span", null, "Welcome back. We've filled in your details.")), React.createElement("div", {
    className: "sub-form"
  }, React.createElement("div", {
    className: "sub-field"
  }, React.createElement("label", {
    className: "sub-label"
  }, "FULL NAME"), React.createElement("input", {
    className: "sub-input" + (errors.name ? " error" : ""),
    placeholder: "Your full name",
    value: form.name || "",
    onChange: set("name"),
    onBlur: () => handleBlur("name")
  }), errors.name && React.createElement("span", {
    className: "sub-field-err"
  }, errors.name)), React.createElement("div", {
    className: "sub-field"
  }, React.createElement("label", {
    className: "sub-label"
  }, "PHONE NUMBER"), React.createElement("input", {
    className: "sub-input" + (errors.phone ? " error" : ""),
    type: "tel",
    placeholder: "01X XXXX XXXX",
    value: form.phone || "",
    onChange: set("phone"),
    onBlur: handlePhoneBlur
  }), errors.phone && React.createElement("span", {
    className: "sub-field-err"
  }, errors.phone)), React.createElement("div", {
    className: "sub-field"
  }, React.createElement("label", {
    className: "sub-label"
  }, "EMAIL ADDRESS ", React.createElement("span", {
    className: "sub-label-opt"
  }, "(OPTIONAL)")), React.createElement("input", {
    className: "sub-input",
    type: "email",
    placeholder: "For order updates (optional)",
    value: form.email || "",
    onChange: set("email")
  })), React.createElement("div", {
    className: "sub-field"
  }, React.createElement("label", {
    className: "sub-label"
  }, "DELIVERY ADDRESS"), React.createElement("input", {
    className: "sub-input" + (errors.address ? " error" : ""),
    placeholder: "House number, road, area",
    value: form.address || "",
    onChange: set("address"),
    onBlur: () => handleBlur("address")
  }), errors.address && React.createElement("span", {
    className: "sub-field-err"
  }, errors.address)), React.createElement("div", {
    className: "sub-field-row"
  }, React.createElement("div", {
    className: "sub-field sub-field--half"
  }, React.createElement("label", {
    className: "sub-label"
  }, "AREA / THANA"), React.createElement("input", {
    className: "sub-input" + (errors.area ? " error" : ""),
    placeholder: "e.g. Badda, Mirpur",
    value: form.area || "",
    onChange: set("area"),
    onBlur: () => handleBlur("area")
  }), errors.area && React.createElement("span", {
    className: "sub-field-err"
  }, errors.area)), React.createElement("div", {
    className: "sub-field sub-field--half"
  }, React.createElement("label", {
    className: "sub-label"
  }, "CITY"), React.createElement("input", {
    className: "sub-input" + (errors.city ? " error" : ""),
    placeholder: "Dhaka",
    value: form.city || "",
    onChange: set("city"),
    onBlur: () => handleBlur("city")
  }), errors.city && React.createElement("span", {
    className: "sub-field-err"
  }, errors.city))), React.createElement("div", {
    className: "sub-info-notice"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info",
    "aria-hidden": "true"
  }), React.createElement("span", null, "Your address is saved to your account. You can update it before each month's delivery from your account page.")), React.createElement("label", {
    className: "sub-checkbox-label"
  }, React.createElement("button", {
    role: "checkbox",
    "aria-checked": createAccount,
    className: "sub-checkbox" + (createAccount ? " checked" : ""),
    onClick: () => setCreateAccount(v => !v),
    type: "button"
  }, createAccount && React.createElement("i", {
    className: "fa-solid fa-check",
    style: {
      fontSize: 8
    },
    "aria-hidden": "true"
  })), React.createElement("span", null, "Create an account to manage deliveries, pause, or cancel from your dashboard.")), !createAccount && React.createElement("p", {
    className: "sub-no-account"
  }, "You'll manage everything via WhatsApp. No dashboard access.")), React.createElement("button", {
    className: "sub-cta-btn",
    onClick: handleContinue
  }, "Continue to Payment \u2192"), React.createElement("button", {
    className: "sub-back-btn",
    onClick: onBack
  }, "\u2190 Back"));
}
function SubScreen3({
  plan,
  freq,
  form,
  onConfirm,
  onBack
}) {
  var [method, setMethod] = React.useState("bkash");
  var [bkashNum, setBkashNum] = React.useState(form.phone || "");
  var [nagadNum, setNagadNum] = React.useState(form.phone || "");
  var [card, setCard] = React.useState({
    number: "",
    expiry: "",
    cvv: ""
  });
  var [promoOpen, setPromoOpen] = React.useState(false);
  var [promoCode, setPromoCode] = React.useState("");
  var [promoStatus, setPromoStatus] = React.useState("idle");
  var [discount, setDiscount] = React.useState(0);
  var [confirmStatus, setConfirmStatus] = React.useState("idle");
  var selectedPlan = SUBSCRIBE_PLANS.find(p => p.id === plan);
  var basePrice = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;
  var isOutsideDhaka = form.city && form.city.trim().toLowerCase() !== "dhaka";
  var deliveryCharge = isOutsideDhaka ? 60 : 0;
  var total = basePrice + deliveryCharge - discount;
  var applyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoStatus("loading");
    setTimeout(() => {
      if (promoCode.trim().toUpperCase() === "MIDNIGHT10") {
        setDiscount(Math.round(basePrice * 0.1));
        setPromoStatus("success");
      } else {
        setPromoStatus("error");
      }
    }, 900);
  };
  var handleConfirm = () => {
    setConfirmStatus("loading");
    setTimeout(() => onConfirm({
      method,
      total
    }), 1400);
  };
  var TABS = [{
    id: "bkash",
    label: "bKash",
    icon: "fa-mobile-screen-button"
  }, {
    id: "nagad",
    label: "Nagad",
    icon: "fa-mobile-screen-button"
  }, {
    id: "card",
    label: "Card",
    icon: "fa-credit-card"
  }];
  return React.createElement("div", {
    className: "sub-screen"
  }, React.createElement(SubStepper, {
    step: 3
  }), React.createElement("h2", {
    className: "sub-title"
  }, "Payment"), React.createElement("p", {
    className: "sub-subtitle"
  }, "First charge today. Then monthly."), React.createElement("div", {
    className: "sub-pay-tabs"
  }, TABS.map(t => React.createElement("button", {
    key: t.id,
    className: "sub-pay-tab" + (method === t.id ? " active" : ""),
    onClick: () => setMethod(t.id)
  }, React.createElement("i", {
    className: `fa-solid ${t.icon}`,
    "aria-hidden": "true"
  }), React.createElement("span", null, t.label)))), (method === "bkash" || method === "nagad") && React.createElement("div", {
    className: "sub-field sub-field--mt"
  }, React.createElement("label", {
    className: "sub-label"
  }, method === "bkash" ? "BKASH" : "NAGAD", " NUMBER"), React.createElement("input", {
    className: "sub-input",
    type: "tel",
    value: method === "bkash" ? bkashNum : nagadNum,
    onChange: e => method === "bkash" ? setBkashNum(e.target.value) : setNagadNum(e.target.value)
  }), React.createElement("p", {
    className: "sub-redirect-note"
  }, "You'll be redirected to ", method === "bkash" ? "bKash" : "Nagad", " to authorise the payment.")), method === "card" && React.createElement("div", {
    className: "sub-card-section"
  }, React.createElement("div", {
    className: "sub-card-brands"
  }, React.createElement("span", {
    className: "sub-card-brand-tag"
  }, "VISA"), React.createElement("span", {
    className: "sub-card-brand-tag"
  }, "MC")), React.createElement("div", {
    className: "sub-field"
  }, React.createElement("label", {
    className: "sub-label"
  }, "CARD NUMBER"), React.createElement("input", {
    className: "sub-input",
    placeholder: "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022",
    value: card.number,
    onChange: e => setCard(c => ({
      ...c,
      number: e.target.value
    }))
  })), React.createElement("div", {
    className: "sub-field-row"
  }, React.createElement("div", {
    className: "sub-field sub-field--half"
  }, React.createElement("label", {
    className: "sub-label"
  }, "EXPIRY"), React.createElement("input", {
    className: "sub-input",
    placeholder: "MM/YY",
    value: card.expiry,
    onChange: e => setCard(c => ({
      ...c,
      expiry: e.target.value
    }))
  })), React.createElement("div", {
    className: "sub-field sub-field--half"
  }, React.createElement("label", {
    className: "sub-label"
  }, "CVV"), React.createElement("input", {
    className: "sub-input",
    placeholder: "\u2022\u2022\u2022",
    value: card.cvv,
    onChange: e => setCard(c => ({
      ...c,
      cvv: e.target.value
    }))
  }))), React.createElement("div", {
    className: "sub-card-security"
  }, React.createElement("i", {
    className: "fa-solid fa-lock",
    style: {
      fontSize: 10
    },
    "aria-hidden": "true"
  }), React.createElement("span", null, "Your card details are encrypted and never stored."))), React.createElement("div", {
    className: "sub-promo-wrap"
  }, !promoOpen ? React.createElement("button", {
    className: "sub-promo-trigger",
    onClick: () => setPromoOpen(true)
  }, "Have a promo code?") : React.createElement("div", {
    className: "sub-promo-panel"
  }, React.createElement("label", {
    className: "sub-label"
  }, "PROMO CODE"), React.createElement("div", {
    className: "sub-promo-row"
  }, React.createElement("input", {
    className: "sub-input" + (promoStatus === "success" ? " promo-ok" : promoStatus === "error" ? " promo-err" : ""),
    placeholder: "Enter code (optional)",
    value: promoCode,
    onChange: e => {
      setPromoCode(e.target.value);
      if (promoStatus !== "idle") setPromoStatus("idle");
    },
    disabled: promoStatus === "loading" || promoStatus === "success"
  }), promoStatus !== "success" && React.createElement("button", {
    className: "sub-promo-apply",
    onClick: applyPromo,
    disabled: promoStatus === "loading" || !promoCode.trim()
  }, promoStatus === "loading" ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : "Apply"), promoStatus === "success" && React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      color: "#4CAF84",
      fontSize: 16,
      marginLeft: 8,
      flexShrink: 0
    },
    "aria-hidden": "true"
  }), promoStatus === "error" && React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    style: {
      color: "#e57373",
      fontSize: 16,
      marginLeft: 8,
      flexShrink: 0
    },
    "aria-hidden": "true"
  })), promoStatus === "error" && React.createElement("p", {
    className: "sub-field-err"
  }, "Invalid code. Please check and try again."))), React.createElement("div", {
    className: "sub-order-summary"
  }, React.createElement("div", {
    className: "sub-summary-row"
  }, React.createElement("span", null, selectedPlan.name, " Plan"), React.createElement("span", null, "\u09F3", basePrice)), React.createElement("div", {
    className: "sub-summary-divider"
  }), React.createElement("div", {
    className: "sub-summary-row"
  }, React.createElement("span", null, "Delivery (", form.city || "Dhaka", ")"), React.createElement("span", {
    className: isOutsideDhaka ? "" : "sub-free-label"
  }, isOutsideDhaka ? `৳${deliveryCharge}` : "Free")), discount > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "sub-summary-divider"
  }), React.createElement("div", {
    className: "sub-summary-row sub-summary-discount"
  }, React.createElement("span", null, "Promo discount"), React.createElement("span", null, "\u2212\u09F3", discount))), React.createElement("div", {
    className: "sub-summary-divider"
  }), React.createElement("div", {
    className: "sub-summary-row sub-summary-total"
  }, React.createElement("span", null, "Total today"), React.createElement("span", null, "\u09F3", total)), React.createElement("p", {
    className: "sub-billing-note"
  }, "Billed monthly. Cancel before the 25th of each month to skip your next delivery.")), React.createElement("button", {
    className: "sub-cta-btn" + (confirmStatus === "loading" ? " loading" : ""),
    onClick: handleConfirm,
    disabled: confirmStatus === "loading"
  }, confirmStatus === "loading" ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : "Confirm Subscription"), React.createElement("button", {
    className: "sub-back-btn",
    onClick: onBack
  }, "\u2190 Back"), React.createElement("div", {
    className: "sub-secured-row"
  }, React.createElement("i", {
    className: "fa-solid fa-lock",
    "aria-hidden": "true"
  }), React.createElement("span", null, "Secured payment")));
}
function SubConfirmation({
  plan,
  freq,
  form,
  onBackToShop
}) {
  var selectedPlan = SUBSCRIBE_PLANS.find(p => p.id === plan);
  var price = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;
  var now = new Date();
  var isAfter25 = now.getDate() >= 25;
  var rawMonth = now.getMonth() + (isAfter25 ? 2 : 1);
  var delivYear = now.getFullYear() + Math.floor(rawMonth / 12);
  var delivMon = rawMonth % 12;
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var isOutsideDhaka = form.city && form.city.trim().toLowerCase() !== "dhaka";
  var endDay = isOutsideDhaka ? 5 : 3;
  var nextCharge = new Date(delivYear, delivMon, 1);
  var cancelMon = isAfter25 ? (now.getMonth() + 1) % 12 : now.getMonth();
  var cancelYear = isAfter25 && now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  var cancelBy = new Date(cancelYear, cancelMon, 25);
  var fmt = d => `${months[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  return React.createElement("div", {
    className: "sub-screen sub-screen--confirm"
  }, React.createElement("div", {
    className: "sub-confirm-icon-wrap"
  }, React.createElement("div", {
    className: "sub-confirm-icon"
  }, React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M5 12l4.5 4.5L19 7",
    stroke: "#FF9100",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })))), React.createElement("h2", {
    className: "sub-confirm-heading"
  }, "You're subscribed."), React.createElement("p", {
    className: "sub-confirm-sub"
  }, "Your first Midnight Pick box is on its way. We'll message you on WhatsApp when it ships."), React.createElement("div", {
    className: "sub-delivery-card"
  }, React.createElement("div", {
    className: "sub-delivery-label"
  }, "FIRST DELIVERY"), React.createElement("div", {
    className: "sub-delivery-dates"
  }, months[delivMon].slice(0, 3), " 1 \u2013 ", months[delivMon].slice(0, 3), " ", endDay, ", ", delivYear), React.createElement("div", {
    className: "sub-delivery-detail"
  }, isOutsideDhaka ? "Outside Dhaka · 3–5 business days" : "Inside Dhaka · 1–2 business days")), React.createElement("div", {
    className: "sub-order-summary sub-order-summary--confirm"
  }, React.createElement("div", {
    className: "sub-summary-label"
  }, "YOUR SUBSCRIPTION"), [["Plan", selectedPlan.name], ["Billed", `৳${price}/month`], ["Next charge", fmt(nextCharge)], ["Cancel by", fmt(cancelBy)]].map(([label, value], i, arr) => React.createElement(React.Fragment, {
    key: label
  }, React.createElement("div", {
    className: "sub-summary-row"
  }, React.createElement("span", null, label), React.createElement("span", {
    className: "sub-confirm-val"
  }, value)), i < arr.length - 1 && React.createElement("div", {
    className: "sub-summary-divider"
  })))), React.createElement("div", {
    className: "sub-whatsapp-strip"
  }, React.createElement("i", {
    className: "fa-brands fa-whatsapp",
    "aria-hidden": "true"
  }), React.createElement("span", null, "We've sent your confirmation to ", React.createElement("strong", {
    style: {
      color: "#F7E3C9"
    }
  }, form.phone), " on WhatsApp.")), React.createElement("button", {
    className: "sub-cta-btn",
    onClick: onBackToShop
  }, "Back to Shop"), React.createElement("button", {
    className: "sub-back-btn",
    onClick: () => {
      window.location.href = "dashboard-user.html";
    }
  }, "Manage Subscription"));
}
function SubCloseConfirm({
  onLeave,
  onStay
}) {
  return React.createElement("div", {
    className: "sub-close-confirm"
  }, React.createElement("p", {
    className: "sub-close-msg"
  }, "Leave subscription setup? Your progress will be lost."), React.createElement("div", {
    className: "sub-close-actions"
  }, React.createElement("button", {
    className: "sub-back-btn",
    onClick: onLeave
  }, "Yes, leave"), React.createElement("button", {
    className: "sub-cta-btn",
    onClick: onStay
  }, "Stay")));
}
function SubscribeModal({
  open,
  onClose
}) {
  var [step, setStep] = React.useState(1);
  var [plan, setPlan] = React.useState("nightshift");
  var [freq, setFreq] = React.useState("monthly");
  var [form, setForm] = React.useState({
    city: "Dhaka"
  });
  var [confirmed, setConfirmed] = React.useState(false);
  var [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setPlan("nightshift");
      setFreq("monthly");
      setForm({
        city: "Dhaka"
      });
      setConfirmed(false);
      setShowCloseConfirm(false);
    }
  }, [open]);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  var requestClose = () => {
    if (step === 1 && !confirmed) {
      onClose();
      return;
    }
    setShowCloseConfirm(true);
  };
  var handleBackToShop = () => {
    onClose();
    window.location.href = "shop.html";
  };
  return React.createElement("div", {
    className: "sub-overlay",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Subscription setup"
  }, React.createElement("div", {
    className: "sub-modal"
  }, !confirmed && !showCloseConfirm && React.createElement("button", {
    className: "sub-close-btn",
    onClick: requestClose,
    "aria-label": "Close"
  }, "\xD7"), showCloseConfirm ? React.createElement(SubCloseConfirm, {
    onLeave: onClose,
    onStay: () => setShowCloseConfirm(false)
  }) : confirmed ? React.createElement(SubConfirmation, {
    plan: plan,
    freq: freq,
    form: form,
    onBackToShop: handleBackToShop
  }) : step === 1 ? React.createElement(SubScreen1, {
    plan: plan,
    setPlan: setPlan,
    freq: freq,
    setFreq: setFreq,
    onContinue: () => setStep(2),
    onClose: onClose
  }) : step === 2 ? React.createElement(SubScreen2, {
    plan: plan,
    freq: freq,
    form: form,
    setForm: setForm,
    onContinue: () => setStep(3),
    onBack: () => setStep(1)
  }) : React.createElement(SubScreen3, {
    plan: plan,
    freq: freq,
    form: form,
    onConfirm: () => setConfirmed(true),
    onBack: () => setStep(2)
  })));
}
var TRACK_STEPS = [{
  id: "confirmed",
  label: "Order Confirmed",
  detail: "Your order has been received and confirmed."
}, {
  id: "packed",
  label: "Packed & Ready",
  detail: "Your order has been packed and is awaiting courier pickup."
}, {
  id: "shipped",
  label: "Shipped",
  detail: "Your order is on its way with the courier."
}, {
  id: "delivered",
  label: "Delivered",
  detail: "Your order has been delivered."
}];
var TRACK_STEP_IDX = {
  confirmed: 0,
  packed: 1,
  shipped: 2,
  delivered: 3
};
var TRACK_STATUS_TO_STEP = {
  processing: 'confirmed',
  packed: 'packed',
  shipped: 'shipped',
  delivered: 'delivered'
};
function formatTrackTs(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
async function fetchOrderStatus(orderId) {
  var res = await fetch(`${getMidnightApiBase()}/track/${encodeURIComponent(orderId.trim().toUpperCase())}`);
  var json = await res.json();
  if (!json.ok) throw {
    code: 'not_found'
  };
  var d = json.data;
  var currentStep = TRACK_STATUS_TO_STEP[d.status] ?? 'confirmed';
  var steps = {};
  for (var [key, val] of Object.entries(d.steps)) {
    steps[key] = val ? {
      timestamp: formatTrackTs(val.at),
      detail: val.detail
    } : null;
  }
  return {
    orderId: d.order_ref,
    currentStep,
    steps
  };
}
var TRACK_STATUS_LBL = {
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "In Transit",
  delivered: "Delivered"
};
var TRACK_STATUS_MOD = {
  confirmed: "confirmed",
  packed: "packed",
  shipped: "transit",
  delivered: "delivered"
};
var BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;
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
function TrackTimeline({
  currentStep,
  stepData
}) {
  var idx = TRACK_STEP_IDX[currentStep] ?? -1;
  return React.createElement("div", {
    className: "track-timeline"
  }, TRACK_STEPS.map((step, i) => {
    var s = i < idx ? "done" : i === idx ? "active" : "pending";
    var data = stepData?.[step.id];
    var isLast = i === TRACK_STEPS.length - 1;
    return React.createElement("div", {
      key: step.id,
      className: "track-step"
    }, React.createElement("div", {
      className: "track-step-aside"
    }, React.createElement("div", {
      className: `track-step-dot track-step-dot--${s}`
    }), !isLast && React.createElement("div", {
      className: `track-step-line track-step-line--${s === "done" ? "done" : "pending"}`
    })), React.createElement("div", {
      className: "track-step-body" + (!isLast ? " track-step-body--gap" : "")
    }, React.createElement("p", {
      className: "track-step-label" + (s === "pending" ? " track-step-label--dim" : "")
    }, step.label), data?.timestamp && React.createElement("p", {
      className: "track-step-time"
    }, data.timestamp), React.createElement("p", {
      className: "track-step-detail" + (s === "pending" ? " track-step-detail--dim" : "")
    }, data?.detail || (s !== "pending" ? step.detail : "Pending"))));
  }));
}
function TrackOrderModal({
  open,
  onClose
}) {
  var [orderId, setOrderId] = React.useState("");
  var [phase, setPhase] = React.useState("idle");
  var [orderData, setOrderData] = React.useState(null);
  var inputRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      setOrderId("");
      setPhase("idle");
      setOrderData(null);
    }
  }, [open]);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  var handleTrack = async () => {
    var id = orderId.trim();
    if (!id) {
      inputRef.current?.focus();
      return;
    }
    setPhase("loading");
    try {
      var data = await fetchOrderStatus(id);
      setOrderData(data);
      setPhase("found");
    } catch {
      setPhase("not_found");
    }
  };
  var reset = () => {
    setPhase("idle");
    setOrderData(null);
  };
  var waUrl = `https://wa.me/8801829531588?text=${encodeURIComponent(`Hi! I need help tracking my order: ${orderId}`)}`;
  return React.createElement("div", {
    className: "track-overlay",
    onClick: e => e.target === e.currentTarget && onClose(),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Track your order"
  }, React.createElement("div", {
    className: "track-modal"
  }, React.createElement("button", {
    className: "track-modal-close",
    onClick: onClose,
    "aria-label": "Close"
  }, React.createElement(CloseIcon, {
    size: 16
  })), React.createElement("div", {
    className: "track-card-head"
  }, React.createElement("h2", null, "Track Your Order"), React.createElement("p", null, "Enter your Order ID from your confirmation message")), (phase === "idle" || phase === "not_found") && React.createElement("div", {
    className: "track-form"
  }, React.createElement("div", {
    className: "track-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-hashtag track-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    ref: inputRef,
    autoFocus: true,
    className: "track-input",
    type: "text",
    placeholder: "e.g. MP-1005",
    value: orderId,
    onChange: e => {
      setOrderId(e.target.value);
      if (phase === "not_found") setPhase("idle");
    },
    onKeyDown: e => e.key === "Enter" && handleTrack(),
    "aria-label": "Order ID",
    autoComplete: "off"
  })), React.createElement("button", {
    className: "track-btn",
    onClick: handleTrack
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass",
    "aria-hidden": "true"
  }), " Track Order")), phase === "not_found" && React.createElement("div", {
    className: "track-not-found"
  }, React.createElement("div", {
    className: "track-not-found-icon"
  }, React.createElement("i", {
    className: "fa-solid fa-box-open"
  })), React.createElement("h3", null, "Order not found"), React.createElement("p", null, "We couldn't find an order matching ", React.createElement("strong", null, orderId), ". Check the ID in your confirmation message, or contact us directly."), React.createElement("a", {
    href: waUrl,
    className: "track-wa-btn",
    target: "_blank",
    rel: "noopener noreferrer"
  }, React.createElement("i", {
    className: "fa-brands fa-whatsapp",
    "aria-hidden": "true"
  }), " Chat on WhatsApp")), phase === "loading" && React.createElement("div", {
    className: "track-loading"
  }, React.createElement("div", {
    className: "track-spinner"
  }), React.createElement("p", null, "Looking up your order\u2026")), phase === "found" && orderData && React.createElement("div", {
    className: "track-result"
  }, React.createElement("div", {
    className: "track-order-meta"
  }, React.createElement("span", {
    className: "track-order-id"
  }, "#", orderData.orderId), React.createElement("span", {
    className: `track-status-badge track-status-badge--${TRACK_STATUS_MOD[orderData.currentStep]}`
  }, TRACK_STATUS_LBL[orderData.currentStep])), React.createElement(TrackTimeline, {
    currentStep: orderData.currentStep,
    stepData: orderData.steps
  }), React.createElement("button", {
    className: "track-reset-btn",
    onClick: reset
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-left",
    "aria-hidden": "true"
  }), " Track another order"))));
}
var _gsiErrorReporter = null;
var AUTH_REDIRECT_KEY = "mp_auth_redirect_after_login";
async function _handleGoogleCredential(response) {
  try {
    var res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        credential: response.credential
      }),
      credentials: 'include'
    });
    var data = await res.json();
    if (!data.ok) throw new Error(data.error?.message || "Google sign-in failed.");
    localStorage.setItem("mp_user", JSON.stringify(data.data.user));
    var redirect = localStorage.getItem(AUTH_REDIRECT_KEY);
    if (redirect) {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
      window.location.href = redirect;
      return;
    }
    window.location.href = ROLE_ROUTES[data.data.user.role] || ROLE_ROUTES.user;
  } catch (err) {
    if (_gsiErrorReporter) _gsiErrorReporter(err.message);
    _gsiErrorReporter = null;
  }
}
function _initGsi() {
  var clientId = window.MP_CONFIG?.googleClientId;
  if (!clientId || !window.google?.accounts?.id) return;
  if (window._gsiInitializedClientId === clientId) {
    if (!_gsiErrorReporter && window._authModalSetError) {
      _gsiErrorReporter = window._authModalSetError;
    }
    return;
  }
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: _handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: false
  });
  window._gsiInitializedClientId = clientId;
  if (!_gsiErrorReporter && window._authModalSetError) {
    _gsiErrorReporter = window._authModalSetError;
  }
}
window._gsiInit = _initGsi;
if (window._gsiReady || window.google?.accounts?.id) {
  _initGsi();
  window._gsiReady = false;
}
var GoogleIcon = ({
  size = 18
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  "aria-hidden": "true"
}, React.createElement("path", {
  d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
  fill: "#4285F4"
}), React.createElement("path", {
  d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
  fill: "#34A853"
}), React.createElement("path", {
  d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z",
  fill: "#FBBC05"
}), React.createElement("path", {
  d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
  fill: "#EA4335"
}));
var EyeIcon = ({
  size = 16,
  open = true
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, open ? React.createElement(React.Fragment, null, React.createElement("path", {
  d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
}), React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
})) : React.createElement(React.Fragment, null, React.createElement("path", {
  d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
}), React.createElement("path", {
  d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
}), React.createElement("line", {
  x1: "1",
  y1: "1",
  x2: "23",
  y2: "23"
})));
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
var MP_BANNER_COOKIE = "mp_banner_dismissed";
var MP_BANNER_CACHE_KEY = "mp_active_banner_cache_v5";
var MP_BANNER_CACHE_TTL = 5 * 60 * 1000;
var AUTH_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
function readCookie(name) {
  return document.cookie.split("; ").find(row => row.startsWith(`${name}=`))?.split("=")[1] || "";
}
function readBannerDismissal() {
  var raw = readCookie(MP_BANNER_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(atob(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}
function writeBannerDismissal(banner, options = {}) {
  if (!banner || banner.display_rule === "every_visit" && !options.forceDevice) return;
  var payload = encodeURIComponent(btoa(JSON.stringify({
    banner_id: banner.id,
    version: banner.version,
    dismissed_at: new Date().toISOString(),
    used_coupon: !!options.forceDevice
  })));
  var maxAge = banner.display_rule === "once_per_device" || options.forceDevice ? `; Max-Age=${Math.max(1, Number(banner.suppress_days || 30)) * 86400}` : "";
  document.cookie = `${MP_BANNER_COOKIE}=${payload}; Path=/; SameSite=Lax${maxAge}`;
}
function isBannerDismissed(banner) {
  if (!banner) return false;
  var dismissal = readBannerDismissal();
  if (banner.display_rule === "every_visit" && dismissal?.used_coupon !== true) return false;
  return dismissal?.banner_id === banner.id && Number(dismissal?.version) === Number(banner.version);
}
async function fetchActiveSiteBanner(options = {}) {
  try {
    var cached = JSON.parse(localStorage.getItem(MP_BANNER_CACHE_KEY) || "null");
    if (!options.force && cached && Date.now() - cached.fetched_at < MP_BANNER_CACHE_TTL) return cached.banner;
  } catch {}
  var res = await fetch(`${API_BASE}/banner/active`, {
    credentials: "include"
  });
  var payload = res.status === 204 ? null : await res.json();
  var banners = normalizeBannerPayload(payload);
  try {
    localStorage.setItem(MP_BANNER_CACHE_KEY, JSON.stringify({
      fetched_at: Date.now(),
      banner: banners
    }));
  } catch {}
  return banners;
}
function normalizeBannerPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.banners)) return payload.banners;
  if (Array.isArray(payload.data?.banners)) return payload.data.banners;
  var banner = payload.data || payload;
  return banner?.id ? [banner] : [];
}
function notifyBannerDismissed(banner) {
  try {
    window.dispatchEvent(new CustomEvent("mp:banner-dismissed", {
      detail: {
        banner_id: banner?.id,
        version: banner?.version
      }
    }));
  } catch {}
}
function isSmallBannerViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
}
async function dismissActiveBannerForCoupon(couponCode) {
  var normalized = String(couponCode || "").trim().toUpperCase();
  if (!normalized) return false;
  var banners = await fetchActiveSiteBanner({
    force: true
  }).catch(() => []);
  var banner = normalizeBannerPayload(banners).find(b => b?.coupon_code && String(b.coupon_code).toUpperCase() === normalized);
  if (!banner?.coupon_code || String(banner.coupon_code).toUpperCase() !== normalized) return false;
  writeBannerDismissal(banner, {
    forceDevice: true
  });
  notifyBannerDismissed(banner);
  return true;
}
window.mpDismissBannerForCoupon = dismissActiveBannerForCoupon;
function SiteBannerManager({
  fallbackMessage,
  floating = false,
  previewBanner = null
}) {
  var [banners, setBanners] = React.useState(previewBanner ? [previewBanner] : null);
  var [hasActiveBanner, setHasActiveBanner] = React.useState(!!previewBanner);
  var [toast, setToast] = React.useState("");
  var [isSmallViewport, setIsSmallViewport] = React.useState(isSmallBannerViewport);
  React.useEffect(() => {
    if (previewBanner) {
      setBanners([previewBanner]);
      setHasActiveBanner(true);
      return;
    }
    var alive = true;
    fetchActiveSiteBanner().then(activePayload => {
      if (!alive) return;
      var active = normalizeBannerPayload(activePayload);
      setHasActiveBanner(active.length > 0);
      setBanners(active.filter(b => !isBannerDismissed(b)));
    }).catch(() => {
      setHasActiveBanner(false);
      setBanners([]);
    });
    return () => {
      alive = false;
    };
  }, [previewBanner?.id, previewBanner?.version]);
  React.useEffect(() => {
    var onDismissed = event => {
      var detail = event.detail || {};
      setBanners(current => (current || []).filter(b => !(detail.banner_id === b.id && Number(detail.version) === Number(b.version))));
    };
    window.addEventListener("mp:banner-dismissed", onDismissed);
    return () => window.removeEventListener("mp:banner-dismissed", onDismissed);
  }, []);
  React.useEffect(() => {
    var media = window.matchMedia("(max-width: 900px)");
    var sync = () => setIsSmallViewport(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    media.addListener?.(sync);
    return () => {
      media.removeEventListener?.("change", sync);
      media.removeListener?.(sync);
    };
  }, []);
  function dismiss(banner) {
    writeBannerDismissal(banner);
    notifyBannerDismissed(banner);
    setBanners(current => (current || []).filter(b => b.id !== banner.id));
  }
  async function primaryAction(banner) {
    if (banner?.coupon_code) {
      try {
        await navigator.clipboard.writeText(banner.coupon_code);
        setToast(banner.id);
      } catch {}
      writeBannerDismissal(banner);
      window.setTimeout(() => {
        notifyBannerDismissed(banner);
        setBanners(current => (current || []).filter(b => b.id !== banner.id));
      }, 900);
      return;
    }
    if (banner.banner_type === "general_offer") {
      writeBannerDismissal(banner);
      window.location.href = "shop.html";
      return;
    }
    if (banner.display_format === "banner") {
      dismiss(banner);
      return;
    }
    dismiss(banner);
  }
  if ((!banners || banners.length === 0) && !hasActiveBanner && fallbackMessage) {
    return React.createElement("div", {
      className: "nav-announcement"
    }, React.createElement("a", {
      href: "shop.html",
      className: "nav-announcement-link"
    }, fallbackMessage, React.createElement(ArrowRight, {
      size: 13
    })));
  }
  if (!banners || banners.length === 0) return null;
  var renderableBanners = banners.filter(b => !(isSmallViewport && b.display_format === "banner"));
  if (renderableBanners.length === 0) return null;
  var firstModalId = renderableBanners.find(b => b.display_format === "modal")?.id;
  var renderOne = banner => {
    if (banner.display_format === "modal") {
      if (banner.id !== firstModalId) return null;
      var modal = React.createElement("div", {
        className: "site-banner-modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Announcement"
      }, React.createElement("div", {
        className: "site-banner-modal"
      }, React.createElement("button", {
        className: "site-banner-close",
        onClick: () => dismiss(banner),
        "aria-label": "Close announcement"
      }, React.createElement(CloseIcon, {
        size: 18
      })), React.createElement("div", {
        className: "site-banner-modal-eyebrow"
      }, "Midnight Pick"), React.createElement("div", {
        className: "site-banner-modal-message"
      }, banner.message), React.createElement("div", {
        className: "site-banner-modal-actions"
      }, (banner.coupon_code || banner.banner_type === "general_offer") && React.createElement("button", {
        className: "site-banner-primary",
        onClick: () => primaryAction(banner)
      }, banner.coupon_code ? "Copy Code" : "Shop Now"), React.createElement("button", {
        className: "site-banner-secondary",
        onClick: () => dismiss(banner)
      }, "No thanks")), toast === banner.id && React.createElement("div", {
        className: "site-banner-toast"
      }, "Code copied")));
      return ReactDOM?.createPortal ? ReactDOM.createPortal(modal, document.body) : modal;
    }
    return React.createElement("div", {
      key: banner.id,
      className: "nav-announcement mp-site-banner" + (floating ? " mp-site-banner-floating" : "")
    }, React.createElement("div", {
      className: "nav-announcement-link mp-site-banner-inner"
    }, React.createElement("span", null, banner.message), (banner.coupon_code || banner.banner_type === "general_offer") && React.createElement("button", {
      className: "mp-site-banner-cta",
      onClick: () => primaryAction(banner)
    }, banner.coupon_code ? "Copy Code" : "Shop Now"), React.createElement("button", {
      className: "mp-site-banner-dismiss",
      onClick: () => dismiss(banner),
      "aria-label": "Dismiss announcement"
    }, React.createElement(CloseIcon, {
      size: 13
    }))), toast === banner.id && React.createElement("span", {
      className: "mp-site-banner-toast"
    }, "Code copied"));
  };
  return React.createElement(React.Fragment, null, renderableBanners.map(renderOne));
}
var ROLE_ROUTES = {
  user: "dashboard-user.html",
  crew: "dashboard-user.html",
  influencer: "dashboard-influencer.html",
  admin: "dashboard-admin.html"
};
(function setupAuthInactivityLogout() {
  if (window.mpAuthInactivity) return;
  var events = ["click", "keydown", "mousemove", "mousedown", "scroll", "touchstart", "wheel"];
  var started = false;
  var timer = null;
  var lastActivity = Date.now();
  function hasUser() {
    return !!localStorage.getItem("mp_user");
  }
  function markActivity() {
    lastActivity = Date.now();
  }
  function stop() {
    if (!started) return;
    started = false;
    if (timer) window.clearInterval(timer);
    timer = null;
    events.forEach(eventName => window.removeEventListener(eventName, markActivity));
  }
  function signOut() {
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }).catch(() => {});
    localStorage.removeItem("mp_user");
    window.location.replace("index.html?session=inactive");
  }
  function start() {
    if (started || !hasUser()) return;
    started = true;
    markActivity();
    events.forEach(eventName => window.addEventListener(eventName, markActivity, {
      passive: true
    }));
    timer = window.setInterval(() => {
      if (!hasUser()) {
        stop();
        return;
      }
      if (Date.now() - lastActivity >= AUTH_INACTIVITY_LIMIT_MS) signOut();
    }, 1000);
  }
  window.mpAuthInactivity = {
    start,
    stop
  };
  start();
})();
function AuthModal({
  open,
  onClose,
  title = "Join the Midnight Circle",
  subtitle = "Track orders, collect Midnight Points, reorder faster, and manage your monthly coffee plan.",
  postAuthRedirect = null
}) {
  var [step, setStep] = React.useState("access");
  var [stepDir, setStepDir] = React.useState("fwd");
  var [method, setMethod] = React.useState("phone");
  var [otpStage, setOtpStage] = React.useState("entry");
  var [otpPurpose, setOtpPurpose] = React.useState("register");
  var [phone, setPhone] = React.useState("");
  var [phoneStatus, setPhoneStatus] = React.useState(null);
  var [phoneChecking, setPhoneChecking] = React.useState(false);
  var [otpDigits, setOtpDigits] = React.useState(["", "", "", "", "", ""]);
  var [otpTimer, setOtpTimer] = React.useState(0);
  var [email, setEmail] = React.useState("");
  var [emailStatus, setEmailStatus] = React.useState(null);
  var [emailChecking, setEmailChecking] = React.useState(false);
  var [password, setPassword] = React.useState("");
  var [showPass, setShowPass] = React.useState(false);
  var [fullName, setFullName] = React.useState("");
  var [optEmail, setOptEmail] = React.useState("");
  var [newVia, setNewVia] = React.useState(null);
  var [pending, setPending] = React.useState(null);
  var [errors, setErrors] = React.useState({});
  var [serverError, setServerError] = React.useState("");
  var [submitting, setSubmitting] = React.useState(false);
  var otpRefs = React.useRef([]);
  var fetchPhoneStatus = React.useCallback(async (p, signal) => {
    var res = await fetch(`${API_BASE}/auth/phone/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: p
      }),
      credentials: "include",
      signal
    });
    var data = await res.json();
    if (!data.ok) throw new Error(data.error?.message || "Couldn't check this phone number.");
    return {
      ...data.data,
      phone: p
    };
  }, []);
  React.useEffect(() => {
    if (open) {
      if (postAuthRedirect) localStorage.setItem(AUTH_REDIRECT_KEY, postAuthRedirect);else localStorage.removeItem(AUTH_REDIRECT_KEY);
      setStep("access");
      setStepDir("fwd");
      setMethod("phone");
      setOtpStage("entry");
      setOtpPurpose("register");
      setPhone("");
      setPhoneStatus(null);
      setPhoneChecking(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpTimer(0);
      setEmail("");
      setEmailStatus(null);
      setEmailChecking(false);
      setPassword("");
      setShowPass(false);
      setFullName("");
      setOptEmail("");
      setNewVia(null);
      setPending(null);
      setErrors({});
      setServerError("");
      setSubmitting(false);
    } else {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
    }
  }, [open, postAuthRedirect]);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) {
      _gsiErrorReporter = null;
      window.google?.accounts?.id?.cancel();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  React.useEffect(() => {
    if (open) {
      _gsiErrorReporter = setServerError;
    } else {
      _gsiErrorReporter = null;
    }
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    var onKey = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  React.useEffect(() => {
    if (otpTimer <= 0) return;
    var id = setTimeout(() => setOtpTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [otpTimer]);
  React.useEffect(() => {
    if (open && otpStage === "code") setTimeout(() => otpRefs.current[0]?.focus(), 140);
  }, [open, otpStage]);
  React.useEffect(() => {
    if (!open || method !== "phone" || otpStage !== "entry") return;
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
        var status = await fetchPhoneStatus(p, controller.signal);
        setPhoneStatus(status);
        if (!status.has_password) setPassword("");
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
  }, [open, method, otpStage, phone, fetchPhoneStatus]);
  if (!open) return null;
  var clearFeedback = () => {
    setErrors({});
    setServerError("");
  };
  var persistAndGo = payload => {
    localStorage.setItem("mp_user", JSON.stringify(payload.user));
    if (postAuthRedirect) {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
      window.location.href = postAuthRedirect;
      return;
    }
    window.location.href = ROLE_ROUTES[payload.user.role] || ROLE_ROUTES.user;
  };
  var switchMethod = m => {
    if (m === method) return;
    setMethod(m);
    clearFeedback();
  };
  var fetchEmailStatus = async emailValue => {
    var normalized = emailValue.trim().toLowerCase();
    var res;
    try {
      res = await fetch(`${API_BASE}/auth/email/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalized
        }),
        credentials: "include"
      });
    } catch {
      throw new Error("Couldn't reach the server. Please check that the backend is running.");
    }
    var data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      var code = data?.error?.code ? ` (${data.error.code})` : "";
      throw new Error(`${data?.error?.message || "Couldn't check this email."}${code}`);
    }
    return {
      ...data.data,
      email: normalized
    };
  };
  var sendOtpForPhone = async (p, purpose = "register") => {
    setPhone(p);
    setSubmitting(true);
    clearFeedback();
    try {
      var res = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: p,
          purpose: purpose === "reset" ? "reset_password" : "register"
        }),
        credentials: 'include'
      });
      var data = await res.json();
      if (!data.ok) throw new Error(authApiErrorMessage(data.error, "Failed to send OTP."));
      setOtpPurpose(purpose);
      setStepDir("fwd");
      setOtpStage("code");
      setOtpTimer(data.data.expires_in || 120);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  var handlePhoneLogin = async () => {
    var p = normalizeBdMobile(phone);
    var errs = {};
    if (!isValidBdMobile(p)) errs.phone = "Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX.";
    if (password && password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setPhone(p);
    var status = phoneStatus?.phone === p ? phoneStatus : null;
    if (!status) {
      setPhoneChecking(true);
      clearFeedback();
      try {
        status = await fetchPhoneStatus(p);
        setPhoneStatus(status);
      } catch (err) {
        setServerError(err.message);
        setPhoneChecking(false);
        return;
      }
      setPhoneChecking(false);
    }
    if (!status.has_password) {
      setPassword("");
      await sendOtpForPhone(p, "register");
      return;
    }
    if (!password) {
      setErrors({
        password: "Enter your password."
      });
      return;
    }
    setSubmitting(true);
    clearFeedback();
    try {
      var res = await fetch(`${API_BASE}/auth/phone/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(password ? {
          phone: p,
          password
        } : {
          phone: p
        }),
        credentials: "include"
      });
      var data = await res.json();
      if (!data.ok) {
        if (data.error?.code === "PHONE_OTP_REQUIRED") {
          setOtpPurpose("register");
          var otpRes = await fetch(`${API_BASE}/auth/otp/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: p,
              purpose: "register"
            }),
            credentials: "include"
          });
          var otpData = await otpRes.json();
          if (!otpData.ok) throw new Error(authApiErrorMessage(otpData.error, "Failed to send OTP."));
          setStepDir("fwd");
          setOtpStage("code");
          setOtpTimer(otpData.data.expires_in || 120);
          setPassword("");
          setSubmitting(false);
          return;
        }
        if (data.error?.code === "PASSWORD_REQUIRED") {
          setErrors({
            password: "Enter your password."
          });
          setSubmitting(false);
          return;
        }
        throw new Error(data.error?.message || "We couldn't sign you in.");
      }
      persistAndGo(data.data);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };
  var handleSendOtp = async (purpose = "register") => {
    var p = normalizeBdMobile(phone);
    if (!isValidBdMobile(p)) {
      setErrors({
        phone: "Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX."
      });
      return;
    }
    await sendOtpForPhone(p, purpose);
  };
  var handleVerifyOtp = async () => {
    var code = otpDigits.join("");
    if (!/^\d{6}$/.test(code)) {
      setErrors({
        otp: "Enter the 6-digit code."
      });
      return;
    }
    setSubmitting(true);
    clearFeedback();
    try {
      var res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: normalizeBdMobile(phone),
          otp: code,
          purpose: otpPurpose === "reset" ? "reset_password" : "register"
        }),
        credentials: 'include'
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "Invalid OTP.");
      if (otpPurpose === "reset") {
        setPending(data.data);
        setNewVia("phone");
        setPassword("");
        setShowPass(false);
        setStepDir("fwd");
        setStep("complete");
        setSubmitting(false);
        return;
      }
      setPending(data.data);
      setNewVia("phone");
      if (data.data.user.name) setFullName(data.data.user.name);
      setPassword("");
      setShowPass(false);
      setStepDir("fwd");
      setStep("complete");
      setSubmitting(false);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };
  var handleResendOtp = async () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setServerError("");
    setSubmitting(true);
    try {
      var res = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: normalizeBdMobile(phone),
          purpose: otpPurpose === "reset" ? "reset_password" : "register"
        }),
        credentials: 'include'
      });
      var data = await res.json();
      if (!data.ok) throw new Error(authApiErrorMessage(data.error, "Failed to send OTP."));
      setOtpTimer(data.data.expires_in || 120);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  var isPhonePasswordSetup = newVia === "phone" && otpPurpose !== "reset" && !!password;
  var normalizedPhoneForStatus = normalizeBdMobile(phone);
  var phoneStatusReady = phoneStatus?.phone === normalizedPhoneForStatus;
  var phoneHasPassword = phoneStatusReady && phoneStatus.has_password;
  var phoneNeedsSetup = phoneStatusReady && !phoneStatus.has_password;
  var phonePasswordPlaceholder = phoneChecking ? "Checking account..." : phoneNeedsSetup ? "You'll set this after OTP" : "Use your saved password";
  var phoneHelpText = phoneChecking ? "Checking this number..." : phoneHasPassword ? "This number already has an account. Enter your password or reset it." : phoneNeedsSetup ? "We'll verify your phone, then complete your profile." : "Enter your phone number to continue.";
  var handleEmailContinue = async e => {
    e.preventDefault();
    var errs = {};
    if (!email.trim()) errs.email = "Email address is required.";else if (!/\S+@\S+\.\S+/.test(email.trim())) errs.email = "Enter a valid email address.";
    var normalizedEmail = email.trim().toLowerCase();
    if (!emailStatus || emailStatus.email !== normalizedEmail) {
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
      setSubmitting(true);
      setEmailChecking(true);
      clearFeedback();
      try {
        var status = await fetchEmailStatus(normalizedEmail);
        setEmailStatus(status);
        if (!status.exists) {
          setNewVia("email");
          setStepDir("fwd");
          setStep("complete");
        }
      } catch (err) {
        setServerError(err.message);
      } finally {
        setSubmitting(false);
        setEmailChecking(false);
      }
      return;
    }
    if (emailStatus.exists && !password) errs.password = "Password is required.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!emailStatus.exists) {
      setNewVia("email");
      setStepDir("fwd");
      setStep("complete");
      return;
    }
    setSubmitting(true);
    clearFeedback();
    try {
      var res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        }),
        credentials: 'include'
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "We couldn't sign you in.");
      persistAndGo(data.data);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };
  var handleComplete = async () => {
    var errs = {};
    if (!fullName.trim()) errs.name = "Full name is required.";
    if (newVia === "phone" && optEmail.trim() && !/\S+@\S+\.\S+/.test(optEmail.trim())) {
      errs.optEmail = "Enter a valid email address.";
    }
    if (newVia === "phone" && otpPurpose === "reset" && password.length < 6) {
      errs.password = "Set a password of at least 6 characters.";
    }
    if (newVia === "phone" && otpPurpose !== "reset" && password && password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    if (newVia === "email" && password.length < 6) {
      errs.password = "Set a password of at least 6 characters.";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    clearFeedback();
    try {
      if (newVia === "phone") {
        if (otpPurpose === "reset") {
          var _res = await fetch(`${API_BASE}/auth/password/reset`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              verification_ticket: pending.verification_ticket,
              password
            }),
            credentials: "include"
          });
          var _data = await _res.json();
          if (!_data.ok) throw new Error(_data.error?.message || "Couldn't save your password.");
          persistAndGo(_data.data);
          return;
        }
        var body = {
          verification_ticket: pending.verification_ticket,
          name: fullName.trim()
        };
        if (optEmail.trim()) body.email = optEmail.trim();
        if (password) body.password = password;
        var res = await fetch(`${API_BASE}/auth/phone/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          credentials: 'include'
        });
        var data = await res.json();
        if (!data.ok) throw new Error(data.error?.message || "Couldn't save your details.");
        persistAndGo(data.data);
      } else {
        var _res2 = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            password
          }),
          credentials: 'include'
        });
        var _data2 = await _res2.json();
        if (!_data2.ok) throw new Error(_data2.error?.message || "Couldn't create your account.");
        persistAndGo(_data2.data);
      }
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };
  var handleGoogleClick = () => {
    setServerError("");
    if (!window.google?.accounts?.id) {
      setServerError("Google Sign-In is not loaded yet — please refresh the page.");
      return;
    }
    _gsiErrorReporter = setServerError;
    window.google.accounts.id.prompt(note => {
      if (note.isNotDisplayed()) {
        var reason = note.getNotDisplayedReason();
        var msg = {
          opt_out_or_no_session: "No Google session found. Please sign in to Google first, then try again.",
          suppressed_by_user: "Google sign-in was suppressed. Try again or allow pop-ups for this site.",
          unregistered_origin: "This site is not yet authorised in Google Cloud Console.",
          browser_not_supported: "Your browser does not support Google One Tap."
        }[reason] || `Google sign-in unavailable (${reason}).`;
        if (_gsiErrorReporter) _gsiErrorReporter(msg);
        _gsiErrorReporter = null;
      } else if (note.isSkippedMoment() || note.isDismissedMoment()) {
        _gsiErrorReporter = null;
      }
    });
  };
  var reassurance = React.createElement("p", {
    className: "auth-reassure"
  }, React.createElement("strong", null, "New here?"), " We'll create your account after verification.", " ", React.createElement("strong", null, "Already a member?"), " We'll sign you in automatically.");
  var accessStep = React.createElement("div", {
    key: `access-${otpStage}`,
    className: `auth-step auth-step--${stepDir}`
  }, React.createElement("div", {
    className: "midnight-member-badge"
  }, "Midnight Member Access"), React.createElement("h2", {
    className: "auth-title"
  }, title), otpStage === "entry" ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "auth-sub"
  }, subtitle), React.createElement("div", {
    className: `auth-method-switch auth-method-switch--${method}`,
    role: "tablist",
    "aria-label": "Sign-in method"
  }, React.createElement("span", {
    className: "auth-method-thumb",
    "aria-hidden": "true"
  }), React.createElement("button", {
    type: "button",
    role: "tab",
    "aria-selected": method === "phone",
    className: `auth-method-btn${method === "phone" ? " active" : ""}`,
    onClick: () => switchMethod("phone")
  }, React.createElement("i", {
    className: "fa-solid fa-mobile-screen-button",
    "aria-hidden": "true"
  }), " Phone"), React.createElement("button", {
    type: "button",
    role: "tab",
    "aria-selected": method === "email",
    className: `auth-method-btn${method === "email" ? " active" : ""}`,
    onClick: () => switchMethod("email")
  }, React.createElement("i", {
    className: "fa-solid fa-envelope",
    "aria-hidden": "true"
  }), " Email")), method === "phone" ? React.createElement("div", {
    className: "auth-form"
  }, React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-phone"
  }, "Phone Number"), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-phone auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-phone",
    className: `auth-input${errors.phone ? " error" : ""}`,
    type: "tel",
    placeholder: "01X XXXX XXXX",
    value: phone,
    onChange: e => {
      setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20));
      if (errors.phone) setErrors(p => ({
        ...p,
        phone: undefined
      }));
    },
    onKeyDown: e => e.key === "Enter" && handlePhoneLogin(),
    autoComplete: "tel",
    autoFocus: true
  })), errors.phone && React.createElement("span", {
    className: "auth-field-err"
  }, errors.phone), phone.trim() && !isValidBdMobile(phone) && !errors.phone && React.createElement("span", {
    className: "auth-field-err"
  }, "Use a Bangladesh mobile number: 013-019, 11 digits locally or +880 format.")), React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-phone-pass"
  }, "Password"), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-lock auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-phone-pass",
    className: `auth-input auth-input--pass${errors.password ? " error" : ""}`,
    type: showPass ? "text" : "password",
    placeholder: phonePasswordPlaceholder,
    value: password,
    onChange: e => {
      setPassword(e.target.value);
      if (errors.password) setErrors(p => ({
        ...p,
        password: undefined
      }));
    },
    onKeyDown: e => e.key === "Enter" && handlePhoneLogin(),
    autoComplete: "current-password",
    disabled: phoneChecking || phoneNeedsSetup
  }), React.createElement("button", {
    type: "button",
    className: "auth-eye-btn",
    onClick: () => setShowPass(v => !v),
    "aria-label": showPass ? "Hide password" : "Show password"
  }, React.createElement(EyeIcon, {
    size: 15,
    open: showPass
  }))), errors.password && React.createElement("span", {
    className: "auth-field-err"
  }, errors.password)), serverError && React.createElement("p", {
    className: "auth-server-err"
  }, serverError), React.createElement("button", {
    type: "button",
    className: `auth-submit-btn${submitting ? " loading" : ""}`,
    disabled: submitting,
    onClick: handlePhoneLogin
  }, submitting ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : React.createElement(React.Fragment, null, phoneHasPassword ? "Sign In" : "Continue", " ", React.createElement("i", {
    className: "fa-solid fa-arrow-right-long",
    "aria-hidden": "true"
  }))), React.createElement("div", {
    className: "auth-new-here"
  }, React.createElement("span", null, phoneHelpText), phoneHasPassword && React.createElement("button", {
    type: "button",
    onClick: () => handleSendOtp("reset")
  }, "Forgot password?"))) : React.createElement("form", {
    className: "auth-form",
    onSubmit: handleEmailContinue,
    noValidate: true
  }, React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-email"
  }, "Email Address"), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-envelope auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-email",
    className: `auth-input${errors.email ? " error" : ""}`,
    type: "email",
    placeholder: "you@example.com",
    value: email,
    onChange: e => {
      setEmail(e.target.value);
      setEmailStatus(null);
      if (errors.email) setErrors(p => ({
        ...p,
        email: undefined
      }));
    },
    autoComplete: "email",
    autoFocus: true
  })), errors.email && React.createElement("span", {
    className: "auth-field-err"
  }, errors.email)), emailStatus?.exists && React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-pass"
  }, "Password"), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-lock auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-pass",
    className: `auth-input auth-input--pass${errors.password ? " error" : ""}`,
    type: showPass ? "text" : "password",
    placeholder: "Your password",
    value: password,
    onChange: e => {
      setPassword(e.target.value);
      if (errors.password) setErrors(p => ({
        ...p,
        password: undefined
      }));
    },
    autoComplete: "current-password"
  }), React.createElement("button", {
    type: "button",
    className: "auth-eye-btn",
    onClick: () => setShowPass(v => !v),
    "aria-label": showPass ? "Hide password" : "Show password"
  }, React.createElement(EyeIcon, {
    size: 15,
    open: showPass
  }))), errors.password && React.createElement("span", {
    className: "auth-field-err"
  }, errors.password)), serverError && React.createElement("p", {
    className: "auth-server-err"
  }, serverError), React.createElement("button", {
    type: "submit",
    className: `auth-submit-btn${submitting ? " loading" : ""}`,
    disabled: submitting
  }, submitting || emailChecking ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : emailStatus?.exists ? "Sign In" : "Continue with Email"), emailStatus && !emailStatus.exists && React.createElement("div", {
    className: "auth-new-here"
  }, React.createElement("span", null, "No account found. Continue to create one."))), method === "email" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "auth-divider"
  }, React.createElement("span", null, "or")), React.createElement("button", {
    className: "auth-google-btn",
    type: "button",
    onClick: handleGoogleClick
  }, React.createElement(GoogleIcon, {
    size: 18
  }), React.createElement("span", null, "Continue with Google"))), reassurance) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "auth-otp-intro"
  }, React.createElement("p", {
    className: "auth-otp-hint"
  }, "Enter the 6-digit code sent to"), React.createElement("p", {
    className: "auth-otp-phone"
  }, phone), React.createElement("p", {
    className: "auth-otp-via"
  }, "via WhatsApp / SMS")), React.createElement("div", {
    className: "auth-otp-row"
  }, [0, 1, 2, 3, 4, 5].map(i => React.createElement("input", {
    key: i,
    ref: el => otpRefs.current[i] = el,
    className: `auth-otp-box${errors.otp ? " error" : ""}${otpDigits[i] ? " filled" : ""}`,
    type: "text",
    inputMode: "numeric",
    maxLength: 1,
    value: otpDigits[i],
    disabled: submitting,
    autoComplete: "one-time-code",
    "aria-label": `Digit ${i + 1}`,
    onChange: e => {
      if (!/^\d*$/.test(e.target.value)) return;
      var d = [...otpDigits];
      d[i] = e.target.value.slice(-1);
      setOtpDigits(d);
      if (errors.otp) setErrors(p => ({
        ...p,
        otp: undefined
      }));
      if (e.target.value && i < 5) otpRefs.current[i + 1]?.focus();
    },
    onKeyDown: e => {
      if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
        var d = [...otpDigits];
        d[i - 1] = "";
        setOtpDigits(d);
        otpRefs.current[i - 1]?.focus();
      }
    },
    onPaste: e => {
      var pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      e.preventDefault();
      var d = Array(6).fill("");
      pasted.split("").forEach((c, j) => {
        d[j] = c;
      });
      setOtpDigits(d);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }))), errors.otp && React.createElement("p", {
    className: "auth-server-err"
  }, errors.otp), serverError && React.createElement("p", {
    className: "auth-server-err"
  }, serverError), React.createElement("button", {
    type: "button",
    className: `auth-submit-btn${submitting ? " loading" : ""}`,
    disabled: submitting || otpDigits.some(d => !d),
    onClick: handleVerifyOtp
  }, submitting ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : "Verify & Continue"), React.createElement("div", {
    className: "auth-otp-meta"
  }, otpTimer > 0 ? React.createElement("span", null, React.createElement("i", {
    className: "fa-regular fa-clock",
    "aria-hidden": "true",
    style: {
      marginRight: 5
    }
  }), "Resend in ", React.createElement("strong", null, Math.floor(otpTimer / 60), ":", String(otpTimer % 60).padStart(2, "0"))) : React.createElement("button", {
    type: "button",
    className: "auth-link",
    onClick: handleResendOtp
  }, "Resend OTP"), React.createElement("span", {
    className: "auth-otp-sep"
  }, "\xB7"), React.createElement("button", {
    type: "button",
    className: "auth-link",
    onClick: () => {
      setStepDir("back");
      setOtpStage("entry");
      setOtpDigits(["", "", "", "", "", ""]);
      clearFeedback();
    }
  }, "Change number")), reassurance));
  var completeStep = React.createElement("div", {
    key: "complete",
    className: `auth-step auth-step--${stepDir}`
  }, React.createElement("div", {
    className: "midnight-member-badge"
  }, "Almost There"), React.createElement("h2", {
    className: "auth-title"
  }, otpPurpose === "reset" ? "Set a new password" : "Complete your account"), React.createElement("div", {
    className: "auth-verified-chip"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    "aria-hidden": "true"
  }), newVia === "phone" ? React.createElement("span", null, "Phone verified \xB7 ", React.createElement("strong", null, phone)) : React.createElement("span", null, "Joining as ", React.createElement("strong", null, email.trim()))), React.createElement("div", {
    className: "auth-form"
  }, React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-name"
  }, "Full Name"), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-user auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-name",
    className: `auth-input${errors.name ? " error" : ""}`,
    type: "text",
    placeholder: "Your full name",
    value: fullName,
    onChange: e => {
      setFullName(e.target.value);
      if (errors.name) setErrors(p => ({
        ...p,
        name: undefined
      }));
    },
    onKeyDown: e => e.key === "Enter" && handleComplete(),
    autoComplete: "name",
    autoFocus: true
  })), errors.name && React.createElement("span", {
    className: "auth-field-err"
  }, errors.name)), newVia === "phone" && React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-opt-email"
  }, "Email Address ", React.createElement("span", {
    className: "auth-optional"
  }, "Optional")), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-envelope auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-opt-email",
    className: `auth-input${errors.optEmail ? " error" : ""}`,
    type: "email",
    placeholder: "you@example.com",
    value: optEmail,
    onChange: e => {
      setOptEmail(e.target.value);
      if (errors.optEmail) setErrors(p => ({
        ...p,
        optEmail: undefined
      }));
    },
    onKeyDown: e => e.key === "Enter" && handleComplete(),
    autoComplete: "email"
  })), errors.optEmail && React.createElement("span", {
    className: "auth-field-err"
  }, errors.optEmail)), newVia !== null && React.createElement("div", {
    className: "auth-field"
  }, React.createElement("label", {
    className: "auth-label",
    htmlFor: "mp-auth-new-pass"
  }, newVia === "email" ? "Password" : otpPurpose === "reset" ? "New Password" : React.createElement(React.Fragment, null, "Password ", React.createElement("span", {
    className: "auth-optional"
  }, "Optional"))), React.createElement("div", {
    className: "auth-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-lock auth-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    id: "mp-auth-new-pass",
    className: `auth-input auth-input--pass${errors.password ? " error" : ""}`,
    type: showPass ? "text" : "password",
    placeholder: newVia === "phone" && otpPurpose !== "reset" ? "Optional, at least 6 characters" : "Set at least 6 characters",
    value: password,
    onChange: e => {
      setPassword(e.target.value);
      if (errors.password) setErrors(p => ({
        ...p,
        password: undefined
      }));
    },
    onKeyDown: e => e.key === "Enter" && handleComplete(),
    autoComplete: "new-password"
  }), React.createElement("button", {
    type: "button",
    className: "auth-eye-btn",
    onClick: () => setShowPass(v => !v),
    "aria-label": showPass ? "Hide password" : "Show password"
  }, React.createElement(EyeIcon, {
    size: 15,
    open: showPass
  }))), errors.password && React.createElement("span", {
    className: "auth-field-err"
  }, errors.password)), serverError && React.createElement("p", {
    className: "auth-server-err"
  }, serverError), React.createElement("button", {
    type: "button",
    className: `auth-submit-btn${submitting ? " loading" : ""}`,
    disabled: submitting,
    onClick: handleComplete
  }, submitting ? React.createElement("span", {
    className: "sub-spinner",
    "aria-hidden": "true"
  }) : otpPurpose === "reset" || isPhonePasswordSetup ? "Save Password" : "Create My Account"), React.createElement("p", {
    className: "auth-footnote"
  }, newVia === "phone" && otpPurpose !== "reset" ? "Password is optional. You can always log in with a code sent to your phone." : otpPurpose === "reset" || isPhonePasswordSetup ? "Use this password for your next phone login." : "You can update these details anytime from your dashboard.")));
  return React.createElement("div", {
    className: "auth-overlay",
    onClick: e => e.target === e.currentTarget && onClose(),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": step === "complete" ? "Complete your Midnight Pick account" : "Join the Midnight Circle"
  }, React.createElement("div", {
    className: "auth-modal"
  }, React.createElement("div", {
    className: "auth-glow",
    "aria-hidden": "true"
  }), React.createElement("div", {
    className: "auth-sheet-handle",
    "aria-hidden": "true"
  }), React.createElement("button", {
    className: "auth-close-btn",
    onClick: onClose,
    "aria-label": "Close"
  }, React.createElement(CloseIcon, {
    size: 16
  })), step === "complete" && newVia === "email" && React.createElement("button", {
    className: "auth-back-btn",
    onClick: () => {
      setStepDir("back");
      setStep("access");
      clearFeedback();
    },
    "aria-label": "Back"
  }, React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }))), React.createElement("div", {
    className: "auth-pane"
  }, React.createElement("div", {
    className: `auth-dots${step === "complete" && newVia === "email" ? " auth-dots--offset" : ""}`,
    "aria-hidden": "true"
  }, React.createElement("span", {
    className: `auth-dot${step === "access" ? " active" : " done"}`
  }), React.createElement("span", {
    className: `auth-dot${step === "complete" ? " active" : ""}`
  })), step === "access" ? accessStep : completeStep)));
}
Object.assign(window, {
  Logo,
  CartIcon,
  HeartIcon,
  UserIcon,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Chev,
  Check,
  Star,
  MenuGridIcon,
  CloseIcon,
  IconCoffeeSack,
  IconBullseye,
  IconQualityBadge,
  StepPick,
  StepSundry,
  StepRoast,
  StepGrind,
  StepJar,
  SocialIcons,
  SubscribeModal,
  TrackOrderModal,
  AuthModal
});
