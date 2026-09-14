// ===== MOBILE MENU =====
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if(menuToggle){
  menuToggle.onclick = () =>{
    menuToggle.classList.toggle("open");
    navLinks.classList.toggle("open");
  };
}

// ===== STICKY HEADER =====
const header=document.getElementById("siteHeader");
window.addEventListener("scroll",()=>{
  header.classList.toggle("scrolled",window.scrollY>20);
});

// ===== SCROLL REVEAL =====
const observer=new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("in-view");
    }
  });
},{threshold:.15});

document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

// ===== NEWSLETTER =====
const form=document.getElementById("newsletterForm");
const email=document.getElementById("newsletterEmail");
const msg=document.getElementById("formMessage");

form?.addEventListener("submit",(e)=>{
  e.preventDefault();
  if(email.value.includes("@")){
    msg.textContent="You're on the list ✓";
    email.value="";
  }else{
    msg.textContent="Please enter a valid email.";
  }
});

// ===== CART =====
const cartBtn=document.getElementById("cartBtn");
const cartPanel=document.getElementById("cartPanel");
const cartOverlay=document.getElementById("cartOverlay");
const closeCart=document.getElementById("closeCart");
const cartItemsEl=document.getElementById("cartItems");
const totalEl=document.getElementById("cartTotal");
const countEl=document.getElementById("cartCount");

let cart=JSON.parse(localStorage.getItem("planora-cart"))||[];

function saveCart(){
  localStorage.setItem("planora-cart",JSON.stringify(cart));
}

function openCart(){
  cartPanel.classList.add("open");
  cartOverlay.classList.add("show");
}

function closeDrawer(){
  cartPanel.classList.remove("open");
  cartOverlay.classList.remove("show");
}

cartBtn.onclick=openCart;
closeCart.onclick=closeDrawer;
cartOverlay.onclick=closeDrawer;

document.querySelectorAll("[data-buy]").forEach(btn=>{
  btn.onclick=()=>{
    const card=btn.closest(".product-card");
    const name=card.dataset.product;
    const price=parseInt(card.dataset.price.replace(/[^\d]/g,""));

    const existing=cart.find(i=>i.name===name);

    if(existing){
      existing.qty++;
    }else{
      cart.push({name,price,qty:1});
    }

    saveCart();
    renderCart();
    openCart();
  };
});

function renderCart(){

  if(cart.length===0){
    cartItemsEl.innerHTML='<p class="empty-cart">Your cart is empty.</p>';
    totalEl.textContent="₹0";
    countEl.textContent="0";
    return;
  }

  let total=0;
  let count=0;

  cartItemsEl.innerHTML="";

  cart.forEach((item,index)=>{
    total+=item.price*item.qty;
    count+=item.qty;

    const div=document.createElement("div");
    div.className="cart-item";

    div.innerHTML=`
      <div class="cart-info">
        <h4>${item.name}</h4>
        <p>₹${item.price}</p>
        <div class="qty">
          <button class="minus">−</button>
          <span>${item.qty}</span>
          <button class="plus">+</button>
        </div>
      </div>
      <strong>₹${item.price*item.qty}</strong>
    `;

    div.querySelector(".plus").onclick=()=>{
      item.qty++;
      saveCart();
      renderCart();
    };

    div.querySelector(".minus").onclick=()=>{
      item.qty--;
      if(item.qty<=0){
        cart.splice(index,1);
      }
      saveCart();
      renderCart();
    };

    cartItemsEl.appendChild(div);
  });

  totalEl.textContent=`₹${total}`;
  countEl.textContent=count;
}

renderCart();
