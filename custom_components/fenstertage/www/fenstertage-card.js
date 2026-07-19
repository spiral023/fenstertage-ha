// Fenstertage Card — bundled by Rollup. Edit sources in src/, then `npm run build`.
function t(t,e,s,n){var i,r=arguments.length,a=r<3?e:null===n?n=Object.getOwnPropertyDescriptor(e,s):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,s,n);else for(var o=t.length-1;o>=0;o--)(i=t[o])&&(a=(r<3?i(a):r>3?i(e,s,a):i(e,s))||a);return r>3&&a&&Object.defineProperty(e,s,a),a}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,n=Symbol(),i=new WeakMap;let r=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=i.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&i.set(e,t))}return t}toString(){return this.cssText}};const a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,n))(e)})(t):t,{is:o,defineProperty:l,getOwnPropertyDescriptor:d,getOwnPropertyNames:c,getOwnPropertySymbols:h,getPrototypeOf:p}=Object,u=globalThis,g=u.trustedTypes,f=g?g.emptyScript:"",m=u.reactiveElementPolyfillSupport,b=(t,e)=>t,v={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},y=(t,e)=>!o(t,e),_={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=_){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),n=this.getPropertyDescriptor(t,s,e);void 0!==n&&l(this.prototype,t,n)}}static getPropertyDescriptor(t,e,s){const{get:n,set:i}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:n,set(e){const r=n?.call(this);i?.call(this,e),this.requestUpdate(t,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...c(t),...h(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,n)=>{if(s)t.adoptedStyleSheets=n.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of n){const n=document.createElement("style"),i=e.litNonce;void 0!==i&&n.setAttribute("nonce",i),n.textContent=s.cssText,t.appendChild(n)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,s);if(void 0!==n&&!0===s.reflect){const i=(void 0!==s.converter?.toAttribute?s.converter:v).toAttribute(e,s.type);this._$Em=t,null==i?this.removeAttribute(n):this.setAttribute(n,i),this._$Em=null}}_$AK(t,e){const s=this.constructor,n=s._$Eh.get(t);if(void 0!==n&&this._$Em!==n){const t=s.getPropertyOptions(n),i="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:v;this._$Em=n;const r=i.fromAttribute(e,t.type);this[n]=r??this._$Ej?.get(n)??r,this._$Em=null}}requestUpdate(t,e,s,n=!1,i){if(void 0!==t){const r=this.constructor;if(!1===n&&(i=this[t]),s??=r.getPropertyOptions(t),!((s.hasChanged??y)(i,e)||s.useDefault&&s.reflect&&i===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:n,wrapped:i},r){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==i||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===n&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,n=this[e];!0!==t||this._$AL.has(e)||void 0===n||this.C(e,void 0,s,n)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,m?.({ReactiveElement:$}),(u.reactiveElementVersions??=[]).push("2.1.2");const x=globalThis,w=t=>t,k=x.trustedTypes,A=k?k.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,C="?"+E,P=`<${C}>`,D=document,T=()=>D.createComment(""),M=t=>null===t||"object"!=typeof t&&"function"!=typeof t,O=Array.isArray,U="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,H=/>/g,z=RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),B=/'/g,I=/"/g,j=/^(?:script|style|textarea|title)$/i,L=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),F=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),V=new WeakMap,q=D.createTreeWalker(D,129);function Y(t,e){if(!O(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(e):e}const J=(t,e)=>{const s=t.length-1,n=[];let i,r=2===e?"<svg>":3===e?"<math>":"",a=N;for(let e=0;e<s;e++){const s=t[e];let o,l,d=-1,c=0;for(;c<s.length&&(a.lastIndex=c,l=a.exec(s),null!==l);)c=a.lastIndex,a===N?"!--"===l[1]?a=R:void 0!==l[1]?a=H:void 0!==l[2]?(j.test(l[2])&&(i=RegExp("</"+l[2],"g")),a=z):void 0!==l[3]&&(a=z):a===z?">"===l[0]?(a=i??N,d=-1):void 0===l[1]?d=-2:(d=a.lastIndex-l[2].length,o=l[1],a=void 0===l[3]?z:'"'===l[3]?I:B):a===I||a===B?a=z:a===R||a===H?a=N:(a=z,i=void 0);const h=a===z&&t[e+1].startsWith("/>")?" ":"";r+=a===N?s+P:d>=0?(n.push(o),s.slice(0,d)+S+s.slice(d)+E+h):s+E+(-2===d?e:h)}return[Y(t,r+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),n]};class K{constructor({strings:t,_$litType$:e},s){let n;this.parts=[];let i=0,r=0;const a=t.length-1,o=this.parts,[l,d]=J(t,e);if(this.el=K.createElement(l,s),q.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(n=q.nextNode())&&o.length<a;){if(1===n.nodeType){if(n.hasAttributes())for(const t of n.getAttributeNames())if(t.endsWith(S)){const e=d[r++],s=n.getAttribute(t).split(E),a=/([.?@])?(.*)/.exec(e);o.push({type:1,index:i,name:a[2],strings:s,ctor:"."===a[1]?tt:"?"===a[1]?et:"@"===a[1]?st:X}),n.removeAttribute(t)}else t.startsWith(E)&&(o.push({type:6,index:i}),n.removeAttribute(t));if(j.test(n.tagName)){const t=n.textContent.split(E),e=t.length-1;if(e>0){n.textContent=k?k.emptyScript:"";for(let s=0;s<e;s++)n.append(t[s],T()),q.nextNode(),o.push({type:2,index:++i});n.append(t[e],T())}}}else if(8===n.nodeType)if(n.data===C)o.push({type:2,index:i});else{let t=-1;for(;-1!==(t=n.data.indexOf(E,t+1));)o.push({type:7,index:i}),t+=E.length-1}i++}}static createElement(t,e){const s=D.createElement("template");return s.innerHTML=t,s}}function Z(t,e,s=t,n){if(e===F)return e;let i=void 0!==n?s._$Co?.[n]:s._$Cl;const r=M(e)?void 0:e._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),void 0===r?i=void 0:(i=new r(t),i._$AT(t,s,n)),void 0!==n?(s._$Co??=[])[n]=i:s._$Cl=i),void 0!==i&&(e=Z(t,i._$AS(t,e.values),i,n)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,n=(t?.creationScope??D).importNode(e,!0);q.currentNode=n;let i=q.nextNode(),r=0,a=0,o=s[0];for(;void 0!==o;){if(r===o.index){let e;2===o.type?e=new Q(i,i.nextSibling,this,t):1===o.type?e=new o.ctor(i,o.name,o.strings,this,t):6===o.type&&(e=new nt(i,this,t)),this._$AV.push(e),o=s[++a]}r!==o?.index&&(i=q.nextNode(),r++)}return q.currentNode=D,n}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,n){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Z(this,t,e),M(t)?t===W||null==t||""===t?(this._$AH!==W&&this._$AR(),this._$AH=W):t!==this._$AH&&t!==F&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>O(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==W&&M(this._$AH)?this._$AA.nextSibling.data=t:this.T(D.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,n="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=K.createElement(Y(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(e);else{const t=new G(n,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new K(t)),e}k(t){O(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,n=0;for(const i of t)n===e.length?e.push(s=new Q(this.O(T()),this.O(T()),this,this.options)):s=e[n],s._$AI(i),n++;n<e.length&&(this._$AR(s&&s._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=w(t).nextSibling;w(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class X{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,n,i){this.type=1,this._$AH=W,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=i,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=W}_$AI(t,e=this,s,n){const i=this.strings;let r=!1;if(void 0===i)t=Z(this,t,e,0),r=!M(t)||t!==this._$AH&&t!==F,r&&(this._$AH=t);else{const n=t;let a,o;for(t=i[0],a=0;a<i.length-1;a++)o=Z(this,n[s+a],e,a),o===F&&(o=this._$AH[a]),r||=!M(o)||o!==this._$AH[a],o===W?t=W:t!==W&&(t+=(o??"")+i[a+1]),this._$AH[a]=o}r&&!n&&this.j(t)}j(t){t===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tt extends X{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===W?void 0:t}}class et extends X{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==W)}}class st extends X{constructor(t,e,s,n,i){super(t,e,s,n,i),this.type=5}_$AI(t,e=this){if((t=Z(this,t,e,0)??W)===F)return;const s=this._$AH,n=t===W&&s!==W||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,i=t!==W&&(s===W||n);n&&this.element.removeEventListener(this.name,this,s),i&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class nt{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}}const it=x.litHtmlPolyfillSupport;it?.(K,Q),(x.litHtmlVersions??=[]).push("3.3.3");const rt=globalThis;class at extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const n=s?.renderBefore??e;let i=n._$litPart$;if(void 0===i){const t=s?.renderBefore??null;n._$litPart$=i=new Q(e.insertBefore(T(),t),t,void 0,s??{})}return i._$AI(t),i})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return F}}at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const ot=rt.litElementPolyfillSupport;ot?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const lt=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:y},ct=(t=dt,e,s)=>{const{kind:n,metadata:i}=s;let r=globalThis.litPropertyMetadata.get(i);if(void 0===r&&globalThis.litPropertyMetadata.set(i,r=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),r.set(s.name,t),"accessor"===n){const{name:n}=s;return{set(s){const i=e.get.call(this);e.set.call(this,s),this.requestUpdate(n,i,t,!0,s)},init(e){return void 0!==e&&this.C(n,void 0,t,e),e}}}if("setter"===n){const{name:n}=s;return function(s){const i=this[n];e.call(this,s),this.requestUpdate(n,i,t,!0,s)}}throw Error("Unsupported decorator location: "+n)};function ht(t){return(e,s)=>"object"==typeof s?ct(t,e,s):((t,e,s)=>{const n=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),n?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function pt(t){return ht({...t,state:!0,attribute:!1})}const ut="fenstertage-card",gt="fenstertage-card-editor",ft={en:{next_bridge_day:"Next bridge day",no_blocks:"No upcoming bridge days",entity_missing:"Entity not found. Is the Fenstertage integration set up?",vacation_days_short:"d off",free_days_short:"d free",efficiency:"Efficiency",level:"Level",planned:"Planned",plan:"Plan",remove:"Remove",cancel:"Cancel",budget:"Budget",of_budget_planned:"planned",over_budget:"over budget",holidays:"Holidays",pick_end:"Tap the last day of your vacation",range_estimate:"Estimated vacation days",in_days:"in {days} days",today:"today",date_range:"Free range",year:"Year",bridge_day:"Bridge day",vacation:"Vacation",weekend:"Weekend"},de:{next_bridge_day:"Nächster Fenstertag",no_blocks:"Keine kommenden Fenstertage",entity_missing:"Entity nicht gefunden. Ist die Fenstertage-Integration eingerichtet?",vacation_days_short:"UT",free_days_short:"Tage frei",efficiency:"Effizienz",level:"Level",planned:"Geplant",plan:"Planen",remove:"Entfernen",cancel:"Abbrechen",budget:"Budget",of_budget_planned:"verplant",over_budget:"über Budget",holidays:"Feiertage",pick_end:"Tippe auf den letzten Urlaubstag",range_estimate:"Voraussichtliche Urlaubstage",in_days:"in {days} Tagen",today:"heute",date_range:"Freier Zeitraum",year:"Jahr",bridge_day:"Fenstertag",vacation:"Urlaub",weekend:"Wochenende"}};function mt(t){const e=(t?.locale?.language??t?.language??"en").split("-")[0],s=ft[e??"en"]??ft.en;return(t,e)=>{let n=s[t]??ft.en[t]??t;if(e)for(const[t,s]of Object.entries(e))n=n.replace(`{${t}}`,String(s));return n}}function bt(t){const e=Math.max(0,Math.min(1,(t-1)/3)),s=Math.round(35+65*e);return`color-mix(in srgb, var(--fen-blue-deep) ${s}%, var(--fen-blue-light) ${100-s}%)`}const vt=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,n)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[n+1],t[0]);return new r(s,t,n)})`
  :host {
    --fen-radius: 10px;
    --fen-transition: 180ms ease;

    /* Markenfarben — bewusst fix statt vom HA-Theme abgeleitet, damit
       Feiertag/Fenstertag/Urlaub/Heute wie auf fenstertage.com immer
       dieselbe Bedeutung tragen, gleich in welchem Dashboard-Theme. */
    --fen-red: #ef4444;
    --fen-blue-deep: #1d4ed8;
    --fen-blue-light: #93c5fd;
    --fen-blue: #3b82f6;
    --fen-green: #22c55e;
    --fen-amber: #f59e0b;
  }
  ha-card {
    padding: 16px;
  }
  .title {
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--primary-text-color);
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .num {
    font-variant-numeric: tabular-nums;
  }

  /* Budget-Balken */
  .budget {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    font-size: 0.85rem;
  }
  .budget .bar {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .budget .bar > div {
    height: 100%;
    border-radius: 3px;
    background: var(--primary-color);
    transition: width var(--fen-transition);
  }
  .budget.over .bar > div {
    background: var(--error-color, #d32f2f);
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-primary-color, #fff);
  }

  /* Dialog-Overlay */
  .overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--card-background-color) 55%, transparent);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ha-card-border-radius, 12px);
    z-index: 2;
  }
  .dialog {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--fen-radius);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
    padding: 16px;
    max-width: 320px;
    width: calc(100% - 48px);
  }
  .dialog h3 {
    margin: 0 0 8px;
    font-size: 1rem;
  }
  .dialog .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.85rem;
    padding: 3px 0;
  }
  .dialog .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  button.fen {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    transition: filter var(--fen-transition), transform var(--fen-transition);
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.fen.ghost {
    background: transparent;
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  button.fen.danger {
    background: var(--error-color, #d32f2f);
  }
  button.fen:hover {
    filter: brightness(1.08);
  }
  button.fen:active {
    transform: scale(0.97);
  }

  .hint {
    padding: 12px;
    border: 1px dashed var(--divider-color);
    border-radius: var(--fen-radius);
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }

  /* list-Modus */
  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .list-row {
    display: grid;
    grid-template-columns: 1fr auto auto 20px;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    font: inherit;
    color: var(--primary-text-color);
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition: background var(--fen-transition);
  }
  .list-row:hover {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .list-row.planned {
    background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
  .list-row .when {
    display: flex;
    flex-direction: column;
  }
  .list-row .date {
    font-weight: 600;
  }
  .small {
    font-size: 0.75rem;
  }
  .list-row .mark {
    color: var(--primary-color);
    font-weight: 700;
    text-align: center;
  }

  /* compact-Modus */
  .compact .when {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .compact .date {
    font-size: 1.3rem;
    font-weight: 700;
  }
  .compact .what {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }

  /* year-Modus */
  .year-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .year-head .budget {
    margin-top: 0;
    min-width: 180px;
    flex: 1;
  }
  .year-tabs {
    display: flex;
    gap: 4px;
  }
  .year-tab {
    font: inherit;
    font-weight: 600;
    background: transparent;
    color: var(--secondary-text-color);
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    padding: 4px 12px;
    cursor: pointer;
    transition: all var(--fen-transition);
  }
  .year-tab.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .pick-hint {
    margin-bottom: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-text-color);
  }
  .months {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 16px;
  }
  .month {
    background: color-mix(in srgb, var(--primary-text-color) 4%, var(--card-background-color));
    border: 1px solid var(--divider-color);
    border-radius: 12px;
    padding: 12px;
  }
  .month-name {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .wd {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    text-align: center;
    padding-bottom: 4px;
  }
  .day {
    font: inherit;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    padding: 0;
    transition: background var(--fen-transition), transform var(--fen-transition);
  }
  .day:hover {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  }
  .day:active {
    transform: scale(0.96);
  }
  .day.weekend {
    color: var(--secondary-text-color);
  }
  .day.past {
    opacity: 0.65;
    cursor: default;
  }
  .day.holiday {
    background: var(--fen-red);
    color: #fff;
    font-weight: 700;
    cursor: default;
  }
  .day.range {
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--fen-blue) 45%, transparent);
  }
  .day.block {
    background: var(--fen-day-color);
    color: #fff;
    font-weight: 700;
  }
  .day.is-planned {
    background: var(--fen-green);
    color: #fff;
    font-weight: 700;
  }
  .day.selected {
    outline: 2px solid var(--fen-blue);
    outline-offset: 1px;
  }
  .day.today {
    box-shadow: inset 0 0 0 2px var(--fen-amber);
  }
  .day.today:not(.holiday):not(.block):not(.is-planned) {
    background: var(--fen-amber);
    color: #221503;
    font-weight: 700;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 14px;
  }
  .legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .legend .holiday-dot {
    background: var(--fen-red);
  }
  .legend .block-dot {
    background: var(--fen-blue);
  }
  .legend .planned-dot {
    background: var(--fen-green);
  }
  .legend .weekend-dot {
    background: var(--secondary-text-color);
    opacity: 0.5;
  }
  .legend .today-dot {
    background: var(--fen-amber);
  }
`;function yt(t){const e=new Date;e.setHours(0,0,0,0);const s=new Date(`${t}T00:00:00`);return Math.round((s.getTime()-e.getTime())/864e5)}function _t(t,e){const s=t.hass.locale?.language??"en";return new Date(`${e}T00:00:00`).toLocaleDateString(s,{weekday:"short",day:"numeric",month:"short"})}function $t(t,e){const s=t.hass.locale?.language??"en";return new Date(`${e}T00:00:00`).toLocaleDateString(s,{day:"2-digit",month:"2-digit",year:"numeric"})}function xt(t,e){const s=t.budget;if(!s)return W;const n=s.budgets[String(e)]??s.defaultTotal,i=t.planned.reduce((t,s)=>t+s.vacation_dates.filter(t=>t.startsWith(`${e}-`)).length,0),r=i>n,a=n>0?Math.min(100,i/n*100):0;return L`
    <div class="budget ${r?"over":""}">
      <span class="num">${e}: ${i}/${n}</span>
      <div class="bar"><div style="width:${a}%"></div></div>
      <span class="muted"
        >${r?`${i-n} ${t.t("over_budget")}`:t.t("of_budget_planned")}</span
      >
    </div>
  `}function wt(t,e,s){return`${t}-${String(e+1).padStart(2,"0")}-${String(s).padStart(2,"0")}`}function kt(){const t=new Date;return wt(t.getFullYear(),t.getMonth(),t.getDate())}function At(t,e,s,n,i){const r=new Date(s,n+1,0).getDate(),a=(new Date(s,n,1).getDay()+6)%7,o=kt(),l=Array.from({length:a},()=>null);for(let t=1;t<=r;t+=1){const r=wt(s,n,t),d=(a+t-1)%7;l.push({iso:r,day:t,weekend:d>=5,past:r<o,holidayName:i.holidayByIso.get(r),block:i.blockByVacationIso.get(r),inFreeRange:i.freeRangeIso.has(r),planned:i.plannedByIso.get(r),selected:e.selStart===r})}return L`
    <div class="month">
      <div class="month-name">${function(t,e,s){const n=t.hass.locale?.language??"en";return new Date(e,s,1).toLocaleDateString(n,{month:"short"})}(t,s,n)}</div>
      <div class="month-grid">
        ${function(t){const e=t.hass.locale?.language??"en";return Array.from({length:7},(t,s)=>new Date(2024,0,1+s).toLocaleDateString(e,{weekday:"short"}).replace(/[^\p{L}]/gu,"").slice(0,2))}(t).map(t=>L`<span class="wd muted">${t}</span>`)}
        ${l.map(t=>{if(null===t)return L`<span></span>`;const s=["day",t.weekend?"weekend":"",t.past?"past":"",t.holidayName?"holiday":"",t.inFreeRange&&!t.block?"range":"",t.block?"block":"",t.planned?"is-planned":"",t.selected?"selected":"",t.iso===kt()?"today":""].filter(Boolean).join(" "),n=t.block?`--fen-day-color:${bt(t.block.efficiency)}`:"";return L`
            <button
              class=${s}
              style=${n}
              title=${t.holidayName??""}
              @click=${()=>function(t,e){if(e.planned)return void t.openDialog({kind:"item",item:e.planned});if(e.block)return void t.openDialog({kind:"block",block:e.block});if(e.weekend||e.holidayName||e.past)return;if(!t.selStart)return void(t.selStart=e.iso);const[s,n]=t.selStart<=e.iso?[t.selStart,e.iso]:[e.iso,t.selStart];t.openDialog({kind:"range",start:s,end:n})}(e,t)}
            >
              ${t.day}
            </button>
          `})}
      </div>
    </div>
  `}function St(t,e){const s=Object.keys(t.years).sort();if(!s.length)return L`<div class="hint">${t.t("no_blocks")}</div>`;const n=e.activeYear??s[0],i=Number(n),r=function(t,e){const s=t.years[e],n=new Map,i=new Map,r=new Set;for(const t of s?.holidays??[])n.set(t.date,t.local_name);const a=t.config.levels;for(const t of s?.blocks??[]){if(a?.length&&!a.includes(t.level))continue;for(const e of t.vacation_dates)i.set(e,t);const e=new Date(`${t.free_range_start}T00:00:00`),s=new Date(`${t.free_range_end}T00:00:00`);for(let t=e.getTime();t<=s.getTime();t+=864e5){const e=new Date(t);r.add(wt(e.getFullYear(),e.getMonth(),e.getDate()))}}const o=new Map;for(const e of t.planned)for(const t of e.vacation_dates)o.set(t,e);return{holidayByIso:n,blockByVacationIso:i,freeRangeIso:r,plannedByIso:o}}(t,n);return L`
    <div class="year-head">
      <div class="year-tabs" role="tablist">
        ${s.map(t=>L`
            <button
              class="year-tab ${t===n?"active":""}"
              role="tab"
              @click=${()=>{e.activeYear=t,e.selStart=void 0}}
            >
              ${t}
            </button>
          `)}
      </div>
      ${t.config.show_budget?xt(t,i):W}
    </div>
    ${e.selStart?L`<div class="pick-hint">${t.t("pick_end")}</div>`:W}
    <div class="months">
      ${Array.from({length:12},(s,n)=>At(t,e,i,n,r))}
    </div>
    <div class="legend muted small">
      <span><i class="dot holiday-dot"></i>${t.t("holidays")}</span>
      <span><i class="dot block-dot"></i>${t.t("bridge_day")}</span>
      <span><i class="dot planned-dot"></i>${t.t("vacation")}</span>
      <span><i class="dot weekend-dot"></i>${t.t("weekend")}</span>
      <span><i class="dot today-dot"></i>${t.t("today")}</span>
    </div>
  `}console.info("%c FENSTERTAGE-CARD %c v0.3.0","background:#222;color:#7fdbca",""),window.customCards=window.customCards??[],window.customCards.push({type:ut,name:"Fenstertage Card",description:"Bridge days, holidays and an interactive year vacation planner.",preview:!0});let Et=class extends at{static{this.styles=vt}setConfig(t){if(!t.entity)throw new Error("fenstertage-card: `entity` is required");this._config={mode:"list",show_budget:!0,...t},this.selStart=void 0,this.activeYear=void 0,this._dialog=void 0}getCardSize(){switch(this._config?.mode){case"compact":return 2;case"year":return 8;default:return 4}}static getStubConfig(t){const e=Object.values(t.states).find(t=>t.entity_id.startsWith("sensor.")&&Array.isArray(t.attributes.blocks)&&"string"==typeof t.attributes.config_entry_id);return{entity:e?.entity_id??"",mode:"list"}}static async getConfigElement(){return await Promise.resolve().then(function(){return Dt}),document.createElement(gt)}_buildCtx(){if(!this.hass||!this._config)return null;const t=this.hass.states[this._config.entity];if(!t)return null;const e=String(t.attributes.config_entry_id??""),s=this._config.levels,n=t.attributes.blocks??[],i=s?.length?n.filter(t=>s.includes(t.level)):n,r=t.attributes.years??{},a=Object.values(this.hass.states).find(t=>t.attributes.config_entry_id===e&&"number"==typeof t.attributes.budget_total);let o=null,l=[];if(a){l=a.attributes.planned_items??[];const t=a.attributes.budgets??{};o={remaining:Number(a.state),total:Number(a.attributes.budget_total),planned:Number(a.attributes.planned_days),budgets:t,defaultTotal:Number(a.attributes.default_budget)}}return{hass:this.hass,config:this._config,entryId:e,blocks:i,years:r,planned:l,plannedBlockIds:new Set(l.filter(t=>null!=t.block_id).map(t=>t.block_id)),budget:o,t:mt(this.hass)}}async _call(t,e){const s=this._buildCtx();if(s){try{await s.hass.callService("fenstertage",t,{config_entry_id:s.entryId,...e})}catch(t){const e=t instanceof Error?t.message:String(t);this.dispatchEvent(new CustomEvent("hass-notification",{detail:{message:e},bubbles:!0,composed:!0}))}this.closeDialog()}}planBlock(t){this._call("plan_bridge_day",{block_id:t})}removeItem(t){this._call("remove_vacation",{item_id:t})}planRange(t,e){this._call("plan_vacation",{start:t,end:e})}openDialog(t){this._dialog=t}closeDialog(){this._dialog=void 0,this.selStart=void 0}render(){if(!this._config)return W;const t=this._buildCtx();if(!t)return L`<ha-card
        ><div class="hint">
          ${mt(this.hass)("entity_missing")}
        </div></ha-card
      >`;let e;switch(t.config.mode){case"compact":e=function(t){const e=t.blocks[0];if(!e)return L`<div class="hint">${t.t("no_blocks")}</div>`;const s=yt(e.vacation_dates[0]);return L`
    <div class="compact">
      <div class="when">
        <span class="date">${_t(t,e.vacation_dates[0])}</span>
        <span class="muted"
          >${0===s?t.t("today"):t.t("in_days",{days:s})}</span
        >
      </div>
      <div class="what">
        <span
          class="badge"
          style="background:${bt(e.efficiency)}"
          >×${e.efficiency.toFixed(1)}</span
        >
        <span class="num"
          >${e.vacation_days} ${t.t("vacation_days_short")} →
          ${e.free_days} ${t.t("free_days_short")}</span
        >
        ${t.plannedBlockIds.has(e.block_id)?L`<span class="muted">✓ ${t.t("planned")}</span>`:W}
      </div>
      ${t.config.show_budget?xt(t,(new Date).getFullYear()):W}
    </div>
  `}(t);break;case"year":e=St(t,this);break;default:e=function(t,e){return t.blocks.length?L`
    <div class="list" role="list">
      ${t.blocks.map(s=>{const n=t.plannedBlockIds.has(s.block_id),i=yt(s.vacation_dates[0]);return L`
          <button
            class="list-row ${n?"planned":""}"
            role="listitem"
            @click=${()=>e.openDialog({kind:"block",block:s})}
          >
            <span class="when">
              <span class="date">${_t(t,s.vacation_dates[0])}</span>
              <span class="muted small">
                ${0===i?t.t("today"):t.t("in_days",{days:i})}
              </span>
            </span>
            <span class="ratio num">
              ${s.vacation_days} ${t.t("vacation_days_short")} →
              ${s.free_days} ${t.t("free_days_short")}
            </span>
            <span
              class="badge"
              style="background:${bt(s.efficiency)}"
              >×${s.efficiency.toFixed(1)}</span
            >
            <span class="mark">${n?"✓":""}</span>
          </button>
        `})}
    </div>
    ${t.config.show_budget?xt(t,(new Date).getFullYear()):W}
  `:L`<div class="hint">${t.t("no_blocks")}</div>`}(t,this)}return L`
      <ha-card style="position:relative">
        ${this._config.title?L`<div class="title">${this._config.title}</div>`:W}
        ${e} ${this._renderDialog(t)}
      </ha-card>
    `}_renderDialog(t){const e=this._dialog;if(!e)return W;if("block"===e.kind){const s=e.block,n=t.plannedBlockIds.has(s.block_id),i=t.planned.find(t=>t.block_id===s.block_id);return L`
        <div class="overlay" @click=${()=>this.closeDialog()}>
          <div class="dialog" @click=${t=>t.stopPropagation()}>
            <h3>
              ${s.vacation_days} ${t.t("vacation_days_short")} →
              ${s.free_days} ${t.t("free_days_short")}
            </h3>
            <div class="row">
              <span class="muted">${t.t("date_range")}</span>
              <span class="num"
                >${$t(t,s.free_range_start)} –
                ${$t(t,s.free_range_end)}</span
              >
            </div>
            <div class="row">
              <span class="muted">${t.t("efficiency")}</span>
              <span class="num">×${s.efficiency.toFixed(2)}</span>
            </div>
            <div class="row">
              <span class="muted">${t.t("holidays")}</span>
              <span>${s.holidays.map(t=>t.local_name).join(", ")}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${()=>this.closeDialog()}>
                ${t.t("cancel")}
              </button>
              ${n&&i?L`<button
                    class="fen danger"
                    @click=${()=>this.removeItem(i.id)}
                  >
                    ${t.t("remove")}
                  </button>`:L`<button
                    class="fen"
                    @click=${()=>this.planBlock(s.block_id)}
                  >
                    ${t.t("plan")}
                  </button>`}
            </div>
          </div>
        </div>
      `}if("item"===e.kind){const s=e.item;return L`
        <div class="overlay" @click=${()=>this.closeDialog()}>
          <div class="dialog" @click=${t=>t.stopPropagation()}>
            <h3>${t.t("planned")}</h3>
            <div class="row">
              <span class="muted">${t.t("date_range")}</span>
              <span class="num"
                >${$t(t,s.start)} –
                ${$t(t,s.end)}</span
              >
            </div>
            <div class="row">
              <span class="muted">${t.t("range_estimate")}</span>
              <span class="num">${s.vacation_dates.length}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${()=>this.closeDialog()}>
                ${t.t("cancel")}
              </button>
              <button
                class="fen danger"
                @click=${()=>this.removeItem(s.id)}
              >
                ${t.t("remove")}
              </button>
            </div>
          </div>
        </div>
      `}return L`
      <div class="overlay" @click=${()=>this.closeDialog()}>
        <div class="dialog" @click=${t=>t.stopPropagation()}>
          <h3>${t.t("plan")}</h3>
          <div class="row">
            <span class="muted">${t.t("date_range")}</span>
            <span class="num"
              >${$t(t,e.start)} –
              ${$t(t,e.end)}</span
            >
          </div>
          <div class="actions">
            <button class="fen ghost" @click=${()=>this.closeDialog()}>
              ${t.t("cancel")}
            </button>
            <button
              class="fen"
              @click=${()=>this.planRange(e.start,e.end)}
            >
              ${t.t("plan")}
            </button>
          </div>
        </div>
      </div>
    `}};t([ht({attribute:!1})],Et.prototype,"hass",void 0),t([pt()],Et.prototype,"_config",void 0),t([pt()],Et.prototype,"selStart",void 0),t([pt()],Et.prototype,"activeYear",void 0),t([pt()],Et.prototype,"_dialog",void 0),Et=t([lt(ut)],Et);const Ct=[{name:"entity",required:!0,selector:{entity:{domain:"sensor"}}},{name:"mode",selector:{select:{mode:"dropdown",options:[{value:"compact",label:"Compact"},{value:"list",label:"List"},{value:"year",label:"Year planner"}]}}},{name:"title",selector:{text:{}}},{name:"show_budget",selector:{boolean:{}}},{name:"levels",selector:{select:{multiple:!0,options:["1","2","3","4","5"].map(t=>({value:t,label:`Level ${t}`}))}}}];let Pt=class extends at{setConfig(t){this._config=t}render(){if(!this.hass||!this._config)return W;const t={...this._config,levels:(this._config.levels??[]).map(String)};return L`
      <ha-form
        .hass=${this.hass}
        .data=${t}
        .schema=${Ct}
        .computeLabel=${t=>t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(t){t.stopPropagation();const e=t.detail.value,{levels:s,...n}=e,i=s?.length?{...n,levels:s.map(Number)}:n;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};t([ht({attribute:!1})],Pt.prototype,"hass",void 0),t([pt()],Pt.prototype,"_config",void 0),Pt=t([lt(gt)],Pt);var Dt=Object.freeze({__proto__:null,get FenstertageCardEditor(){return Pt}});export{Et as FenstertageCard};
