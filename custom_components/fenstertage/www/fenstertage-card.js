// Fenstertage Card — bundled by Rollup. Edit sources in src/, then `npm run build`.
function t(t,e,s,i){var n,r=arguments.length,o=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(n=t[a])&&(o=(r<3?n(o):r>3?n(e,s,o):n(e,s))||o);return r>3&&o&&Object.defineProperty(e,s,o),o}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),n=new WeakMap;let r=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&n.set(e,t))}return t}toString(){return this.cssText}};const o=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:a,defineProperty:l,getOwnPropertyDescriptor:c,getOwnPropertyNames:d,getOwnPropertySymbols:h,getPrototypeOf:p}=Object,u=globalThis,g=u.trustedTypes,f=g?g.emptyScript:"",m=u.reactiveElementPolyfillSupport,y=(t,e)=>t,v={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},_=(t,e)=>!a(t,e),b={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:_};Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&l(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:n}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const r=i?.call(this);n?.call(this,e),this.requestUpdate(t,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...d(t),...h(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(o(t))}else void 0!==t&&e.push(o(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),n=e.litNonce;void 0!==n&&i.setAttribute("nonce",n),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const n=(void 0!==s.converter?.toAttribute?s.converter:v).toAttribute(e,s.type);this._$Em=t,null==n?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:v;this._$Em=i;const r=n.fromAttribute(e,t.type);this[i]=r??this._$Ej?.get(i)??r,this._$Em=null}}requestUpdate(t,e,s,i=!1,n){if(void 0!==t){const r=this.constructor;if(!1===i&&(n=this[t]),s??=r.getPropertyOptions(t),!((s.hasChanged??_)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},r){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==n||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[y("elementProperties")]=new Map,$[y("finalized")]=new Map,m?.({ReactiveElement:$}),(u.reactiveElementVersions??=[]).push("2.1.2");const x=globalThis,w=t=>t,A=x.trustedTypes,k=A?A.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,C="?"+E,P=`<${C}>`,D=document,T=()=>D.createComment(""),O=t=>null===t||"object"!=typeof t&&"function"!=typeof t,M=Array.isArray,U="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,H=/>/g,z=RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),I=/'/g,j=/"/g,B=/^(?:script|style|textarea|title)$/i,L=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),F=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),V=new WeakMap,W=D.createTreeWalker(D,129);function Y(t,e){if(!M(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==k?k.createHTML(e):e}const J=(t,e)=>{const s=t.length-1,i=[];let n,r=2===e?"<svg>":3===e?"<math>":"",o=N;for(let e=0;e<s;e++){const s=t[e];let a,l,c=-1,d=0;for(;d<s.length&&(o.lastIndex=d,l=o.exec(s),null!==l);)d=o.lastIndex,o===N?"!--"===l[1]?o=R:void 0!==l[1]?o=H:void 0!==l[2]?(B.test(l[2])&&(n=RegExp("</"+l[2],"g")),o=z):void 0!==l[3]&&(o=z):o===z?">"===l[0]?(o=n??N,c=-1):void 0===l[1]?c=-2:(c=o.lastIndex-l[2].length,a=l[1],o=void 0===l[3]?z:'"'===l[3]?j:I):o===j||o===I?o=z:o===R||o===H?o=N:(o=z,n=void 0);const h=o===z&&t[e+1].startsWith("/>")?" ":"";r+=o===N?s+P:c>=0?(i.push(a),s.slice(0,c)+S+s.slice(c)+E+h):s+E+(-2===c?e:h)}return[Y(t,r+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class K{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,r=0;const o=t.length-1,a=this.parts,[l,c]=J(t,e);if(this.el=K.createElement(l,s),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=W.nextNode())&&a.length<o;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(S)){const e=c[r++],s=i.getAttribute(t).split(E),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:n,name:o[2],strings:s,ctor:"."===o[1]?tt:"?"===o[1]?et:"@"===o[1]?st:X}),i.removeAttribute(t)}else t.startsWith(E)&&(a.push({type:6,index:n}),i.removeAttribute(t));if(B.test(i.tagName)){const t=i.textContent.split(E),e=t.length-1;if(e>0){i.textContent=A?A.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],T()),W.nextNode(),a.push({type:2,index:++n});i.append(t[e],T())}}}else if(8===i.nodeType)if(i.data===C)a.push({type:2,index:n});else{let t=-1;for(;-1!==(t=i.data.indexOf(E,t+1));)a.push({type:7,index:n}),t+=E.length-1}n++}}static createElement(t,e){const s=D.createElement("template");return s.innerHTML=t,s}}function Z(t,e,s=t,i){if(e===F)return e;let n=void 0!==i?s._$Co?.[i]:s._$Cl;const r=O(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),void 0===r?n=void 0:(n=new r(t),n._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=n:s._$Cl=n),void 0!==n&&(e=Z(t,n._$AS(t,e.values),n,i)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??D).importNode(e,!0);W.currentNode=i;let n=W.nextNode(),r=0,o=0,a=s[0];for(;void 0!==a;){if(r===a.index){let e;2===a.type?e=new Q(n,n.nextSibling,this,t):1===a.type?e=new a.ctor(n,a.name,a.strings,this,t):6===a.type&&(e=new it(n,this,t)),this._$AV.push(e),a=s[++o]}r!==a?.index&&(n=W.nextNode(),r++)}return W.currentNode=D,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Z(this,t,e),O(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==F&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>M(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&O(this._$AH)?this._$AA.nextSibling.data=t:this.T(D.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=K.createElement(Y(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new G(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new K(t)),e}k(t){M(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const n of t)i===e.length?e.push(s=new Q(this.O(T()),this.O(T()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=w(t).nextSibling;w(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class X{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const n=this.strings;let r=!1;if(void 0===n)t=Z(this,t,e,0),r=!O(t)||t!==this._$AH&&t!==F,r&&(this._$AH=t);else{const i=t;let o,a;for(t=n[0],o=0;o<n.length-1;o++)a=Z(this,i[s+o],e,o),a===F&&(a=this._$AH[o]),r||=!O(a)||a!==this._$AH[o],a===q?t=q:t!==q&&(t+=(a??"")+n[o+1]),this._$AH[o]=a}r&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tt extends X{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class et extends X{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class st extends X{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=Z(this,t,e,0)??q)===F)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class it{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}}const nt=x.litHtmlPolyfillSupport;nt?.(K,Q),(x.litHtmlVersions??=[]).push("3.3.3");const rt=globalThis;class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let n=i._$litPart$;if(void 0===n){const t=s?.renderBefore??null;i._$litPart$=n=new Q(e.insertBefore(T(),t),t,void 0,s??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return F}}ot._$litElement$=!0,ot.finalized=!0,rt.litElementHydrateSupport?.({LitElement:ot});const at=rt.litElementPolyfillSupport;at?.({LitElement:ot}),(rt.litElementVersions??=[]).push("4.2.2");const lt=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ct={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:_},dt=(t=ct,e,s)=>{const{kind:i,metadata:n}=s;let r=globalThis.litPropertyMetadata.get(n);if(void 0===r&&globalThis.litPropertyMetadata.set(n,r=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),r.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const n=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,n,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const n=this[i];e.call(this,s),this.requestUpdate(i,n,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};function ht(t){return(e,s)=>"object"==typeof s?dt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function pt(t){return ht({...t,state:!0,attribute:!1})}const ut="fenstertage-card",gt="fenstertage-card-editor",ft={en:{next_bridge_day:"Next bridge day",no_blocks:"No upcoming bridge days",entity_missing:"Entity not found. Is the Fenstertage integration set up?",vacation_days_short:"d off",free_days_short:"d free",efficiency:"Efficiency",level:"Level",planned:"Planned",plan:"Plan",remove:"Remove",cancel:"Cancel",budget:"Budget",of_budget_planned:"planned",over_budget:"over budget",holidays:"Holidays",pick_end:"Tap the last day of your vacation",range_estimate:"Estimated vacation days",in_days:"in {days} days",today:"today",date_range:"Free range",year:"Year"},de:{next_bridge_day:"Nächster Fenstertag",no_blocks:"Keine kommenden Fenstertage",entity_missing:"Entity nicht gefunden. Ist die Fenstertage-Integration eingerichtet?",vacation_days_short:"UT",free_days_short:"Tage frei",efficiency:"Effizienz",level:"Level",planned:"Geplant",plan:"Planen",remove:"Entfernen",cancel:"Abbrechen",budget:"Budget",of_budget_planned:"verplant",over_budget:"über Budget",holidays:"Feiertage",pick_end:"Tippe auf den letzten Urlaubstag",range_estimate:"Voraussichtliche Urlaubstage",in_days:"in {days} Tagen",today:"heute",date_range:"Freier Zeitraum",year:"Jahr"}};function mt(t){const e=(t?.locale?.language??t?.language??"en").split("-")[0],s=ft[e??"en"]??ft.en;return(t,e)=>{let i=s[t]??ft.en[t]??t;if(e)for(const[t,s]of Object.entries(e))i=i.replace(`{${t}}`,String(s));return i}}function yt(t){const e=Math.max(0,Math.min(1,(t-1)/3)),s=Math.round(25+75*e);return`color-mix(in srgb, var(--primary-color) ${s}%, var(--secondary-text-color) ${100-s}%)`}const vt=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new r(s,t,i)})`
  :host {
    --fen-radius: 10px;
    --fen-transition: 180ms ease;
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
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }
  .month-name {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 4px;
    text-transform: capitalize;
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }
  .wd {
    font-size: 0.6rem;
    text-align: center;
  }
  .day {
    font: inherit;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
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
    opacity: 0.35;
    cursor: default;
  }
  .day.holiday {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    font-weight: 700;
    cursor: default;
  }
  .day.range {
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--primary-color) 35%, transparent);
  }
  .day.block {
    background: var(--fen-day-color);
    color: var(--text-primary-color, #fff);
    font-weight: 700;
  }
  .day.is-planned {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    font-weight: 700;
    box-shadow: inset 0 0 0 2px var(--card-background-color);
  }
  .day.selected {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
  .day.today {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .legend {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }
  .legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .legend .block-dot {
    background: var(--primary-color);
    opacity: 0.75;
  }
  .legend .holiday-dot {
    background: color-mix(in srgb, var(--primary-color) 25%, transparent);
  }
  .legend .planned-dot {
    background: var(--primary-color);
  }
`;function _t(t){const e=new Date;e.setHours(0,0,0,0);const s=new Date(`${t}T00:00:00`);return Math.round((s.getTime()-e.getTime())/864e5)}function bt(t,e){const s=t.hass.locale?.language??"en";return new Date(`${e}T00:00:00`).toLocaleDateString(s,{weekday:"short",day:"numeric",month:"short"})}function $t(t,e){const s=t.hass.locale?.language??"en";return new Date(`${e}T00:00:00`).toLocaleDateString(s,{day:"2-digit",month:"2-digit",year:"numeric"})}function xt(t,e){const s=t.budget;if(!s)return q;const i=s.budgets[String(e)]??s.defaultTotal,n=t.planned.reduce((t,s)=>t+s.vacation_dates.filter(t=>t.startsWith(`${e}-`)).length,0),r=n>i,o=i>0?Math.min(100,n/i*100):0;return L`
    <div class="budget ${r?"over":""}">
      <span class="num">${e}: ${n}/${i}</span>
      <div class="bar"><div style="width:${o}%"></div></div>
      <span class="muted"
        >${r?`${n-i} ${t.t("over_budget")}`:t.t("of_budget_planned")}</span
      >
    </div>
  `}function wt(t,e,s){return`${t}-${String(e+1).padStart(2,"0")}-${String(s).padStart(2,"0")}`}function At(){const t=new Date;return wt(t.getFullYear(),t.getMonth(),t.getDate())}function kt(t,e,s,i,n){const r=new Date(s,i+1,0).getDate(),o=(new Date(s,i,1).getDay()+6)%7,a=At(),l=Array.from({length:o},()=>null);for(let t=1;t<=r;t+=1){const r=wt(s,i,t),c=(o+t-1)%7;l.push({iso:r,day:t,weekend:c>=5,past:r<a,holidayName:n.holidayByIso.get(r),block:n.blockByVacationIso.get(r),inFreeRange:n.freeRangeIso.has(r),planned:n.plannedByIso.get(r),selected:e.selStart===r})}return L`
    <div class="month">
      <div class="month-name">${function(t,e,s){const i=t.hass.locale?.language??"en";return new Date(e,s,1).toLocaleDateString(i,{month:"short"})}(t,s,i)}</div>
      <div class="month-grid">
        ${function(t){const e=t.hass.locale?.language??"en";return Array.from({length:7},(t,s)=>new Date(2024,0,1+s).toLocaleDateString(e,{weekday:"narrow"}))}(t).map(t=>L`<span class="wd muted">${t}</span>`)}
        ${l.map(t=>{if(null===t)return L`<span></span>`;const s=["day",t.weekend?"weekend":"",t.past?"past":"",t.holidayName?"holiday":"",t.inFreeRange&&!t.block?"range":"",t.block?"block":"",t.planned?"is-planned":"",t.selected?"selected":"",t.iso===At()?"today":""].filter(Boolean).join(" "),i=t.block?`--fen-day-color:${yt(t.block.efficiency)}`:"";return L`
            <button
              class=${s}
              style=${i}
              title=${t.holidayName??""}
              @click=${()=>function(t,e){if(e.planned)return void t.openDialog({kind:"item",item:e.planned});if(e.block)return void t.openDialog({kind:"block",block:e.block});if(e.weekend||e.holidayName||e.past)return;if(!t.selStart)return void(t.selStart=e.iso);const[s,i]=t.selStart<=e.iso?[t.selStart,e.iso]:[e.iso,t.selStart];t.openDialog({kind:"range",start:s,end:i})}(e,t)}
            >
              ${t.day}
            </button>
          `})}
      </div>
    </div>
  `}function St(t,e){const s=Object.keys(t.years).sort();if(!s.length)return L`<div class="hint">${t.t("no_blocks")}</div>`;const i=e.activeYear??s[0],n=Number(i),r=function(t,e){const s=t.years[e],i=new Map,n=new Map,r=new Set;for(const t of s?.holidays??[])i.set(t.date,t.local_name);const o=t.config.levels;for(const t of s?.blocks??[]){if(o?.length&&!o.includes(t.level))continue;for(const e of t.vacation_dates)n.set(e,t);const e=new Date(`${t.free_range_start}T00:00:00`),s=new Date(`${t.free_range_end}T00:00:00`);for(let t=e.getTime();t<=s.getTime();t+=864e5){const e=new Date(t);r.add(wt(e.getFullYear(),e.getMonth(),e.getDate()))}}const a=new Map;for(const e of t.planned)for(const t of e.vacation_dates)a.set(t,e);return{holidayByIso:i,blockByVacationIso:n,freeRangeIso:r,plannedByIso:a}}(t,i);return L`
    <div class="year-head">
      <div class="year-tabs" role="tablist">
        ${s.map(t=>L`
            <button
              class="year-tab ${t===i?"active":""}"
              role="tab"
              @click=${()=>{e.activeYear=t,e.selStart=void 0}}
            >
              ${t}
            </button>
          `)}
      </div>
      ${t.config.show_budget?xt(t,n):q}
    </div>
    ${e.selStart?L`<div class="pick-hint">${t.t("pick_end")}</div>`:q}
    <div class="months">
      ${Array.from({length:12},(s,i)=>kt(t,e,n,i,r))}
    </div>
    <div class="legend muted small">
      <span><i class="dot block-dot"></i>Fenstertag</span>
      <span><i class="dot holiday-dot"></i>${t.t("holidays")}</span>
      <span><i class="dot planned-dot"></i>${t.t("planned")}</span>
    </div>
  `}console.info("%c FENSTERTAGE-CARD %c v0.2.0","background:#222;color:#7fdbca",""),window.customCards=window.customCards??[],window.customCards.push({type:ut,name:"Fenstertage Card",description:"Bridge days, holidays and an interactive year vacation planner.",preview:!0});let Et=class extends ot{static{this.styles=vt}setConfig(t){if(!t.entity)throw new Error("fenstertage-card: `entity` is required");this._config={mode:"list",show_budget:!0,...t},this.selStart=void 0,this.activeYear=void 0,this._dialog=void 0}getCardSize(){switch(this._config?.mode){case"compact":return 2;case"year":return 8;default:return 4}}static getStubConfig(t){const e=Object.values(t.states).find(t=>t.entity_id.startsWith("sensor.")&&Array.isArray(t.attributes.blocks)&&"string"==typeof t.attributes.config_entry_id);return{entity:e?.entity_id??"",mode:"list"}}static async getConfigElement(){return await Promise.resolve().then(function(){return Dt}),document.createElement(gt)}_buildCtx(){if(!this.hass||!this._config)return null;const t=this.hass.states[this._config.entity];if(!t)return null;const e=String(t.attributes.config_entry_id??""),s=this._config.levels,i=t.attributes.blocks??[],n=s?.length?i.filter(t=>s.includes(t.level)):i,r=t.attributes.years??{},o=Object.values(this.hass.states).find(t=>t.attributes.config_entry_id===e&&"number"==typeof t.attributes.budget_total);let a=null,l=[];if(o){l=o.attributes.planned_items??[];const t=o.attributes.budgets??{};a={remaining:Number(o.state),total:Number(o.attributes.budget_total),planned:Number(o.attributes.planned_days),budgets:t,defaultTotal:Number(o.attributes.default_budget)}}return{hass:this.hass,config:this._config,entryId:e,blocks:n,years:r,planned:l,plannedBlockIds:new Set(l.filter(t=>null!=t.block_id).map(t=>t.block_id)),budget:a,t:mt(this.hass)}}async _call(t,e){const s=this._buildCtx();if(s){try{await s.hass.callService("fenstertage",t,{config_entry_id:s.entryId,...e})}catch(t){const e=t instanceof Error?t.message:String(t);this.dispatchEvent(new CustomEvent("hass-notification",{detail:{message:e},bubbles:!0,composed:!0}))}this.closeDialog()}}planBlock(t){this._call("plan_bridge_day",{block_id:t})}removeItem(t){this._call("remove_vacation",{item_id:t})}planRange(t,e){this._call("plan_vacation",{start:t,end:e})}openDialog(t){this._dialog=t}closeDialog(){this._dialog=void 0,this.selStart=void 0}render(){if(!this._config)return q;const t=this._buildCtx();if(!t)return L`<ha-card
        ><div class="hint">
          ${mt(this.hass)("entity_missing")}
        </div></ha-card
      >`;let e;switch(t.config.mode){case"compact":e=function(t){const e=t.blocks[0];if(!e)return L`<div class="hint">${t.t("no_blocks")}</div>`;const s=_t(e.vacation_dates[0]);return L`
    <div class="compact">
      <div class="when">
        <span class="date">${bt(t,e.vacation_dates[0])}</span>
        <span class="muted"
          >${0===s?t.t("today"):t.t("in_days",{days:s})}</span
        >
      </div>
      <div class="what">
        <span
          class="badge"
          style="background:${yt(e.efficiency)}"
          >×${e.efficiency.toFixed(1)}</span
        >
        <span class="num"
          >${e.vacation_days} ${t.t("vacation_days_short")} →
          ${e.free_days} ${t.t("free_days_short")}</span
        >
        ${t.plannedBlockIds.has(e.block_id)?L`<span class="muted">✓ ${t.t("planned")}</span>`:q}
      </div>
      ${t.config.show_budget?xt(t,(new Date).getFullYear()):q}
    </div>
  `}(t);break;case"year":e=St(t,this);break;default:e=function(t,e){return t.blocks.length?L`
    <div class="list" role="list">
      ${t.blocks.map(s=>{const i=t.plannedBlockIds.has(s.block_id),n=_t(s.vacation_dates[0]);return L`
          <button
            class="list-row ${i?"planned":""}"
            role="listitem"
            @click=${()=>e.openDialog({kind:"block",block:s})}
          >
            <span class="when">
              <span class="date">${bt(t,s.vacation_dates[0])}</span>
              <span class="muted small">
                ${0===n?t.t("today"):t.t("in_days",{days:n})}
              </span>
            </span>
            <span class="ratio num">
              ${s.vacation_days} ${t.t("vacation_days_short")} →
              ${s.free_days} ${t.t("free_days_short")}
            </span>
            <span
              class="badge"
              style="background:${yt(s.efficiency)}"
              >×${s.efficiency.toFixed(1)}</span
            >
            <span class="mark">${i?"✓":""}</span>
          </button>
        `})}
    </div>
    ${t.config.show_budget?xt(t,(new Date).getFullYear()):q}
  `:L`<div class="hint">${t.t("no_blocks")}</div>`}(t,this)}return L`
      <ha-card style="position:relative">
        ${this._config.title?L`<div class="title">${this._config.title}</div>`:q}
        ${e} ${this._renderDialog(t)}
      </ha-card>
    `}_renderDialog(t){const e=this._dialog;if(!e)return q;if("block"===e.kind){const s=e.block,i=t.plannedBlockIds.has(s.block_id),n=t.planned.find(t=>t.block_id===s.block_id);return L`
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
              ${i&&n?L`<button
                    class="fen danger"
                    @click=${()=>this.removeItem(n.id)}
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
    `}};t([ht({attribute:!1})],Et.prototype,"hass",void 0),t([pt()],Et.prototype,"_config",void 0),t([pt()],Et.prototype,"selStart",void 0),t([pt()],Et.prototype,"activeYear",void 0),t([pt()],Et.prototype,"_dialog",void 0),Et=t([lt(ut)],Et);const Ct=[{name:"entity",required:!0,selector:{entity:{domain:"sensor"}}},{name:"mode",selector:{select:{mode:"dropdown",options:[{value:"compact",label:"Compact"},{value:"list",label:"List"},{value:"year",label:"Year planner"}]}}},{name:"title",selector:{text:{}}},{name:"show_budget",selector:{boolean:{}}},{name:"levels",selector:{select:{multiple:!0,options:["1","2","3","4","5"].map(t=>({value:t,label:`Level ${t}`}))}}}];let Pt=class extends ot{setConfig(t){this._config=t}render(){if(!this.hass||!this._config)return q;const t={...this._config,levels:(this._config.levels??[]).map(String)};return L`
      <ha-form
        .hass=${this.hass}
        .data=${t}
        .schema=${Ct}
        .computeLabel=${t=>t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(t){t.stopPropagation();const e=t.detail.value,{levels:s,...i}=e,n=s?.length?{...i,levels:s.map(Number)}:i;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:n},bubbles:!0,composed:!0}))}};t([ht({attribute:!1})],Pt.prototype,"hass",void 0),t([pt()],Pt.prototype,"_config",void 0),Pt=t([lt(gt)],Pt);var Dt=Object.freeze({__proto__:null,get FenstertageCardEditor(){return Pt}});export{Et as FenstertageCard};
