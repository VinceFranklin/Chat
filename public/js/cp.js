let adduu = document.getElementById("addinterests");
let interests =document.querySelector(".interests");
let interestsdiv = document.querySelectorAll(".interests-div")[0];

adduu.addEventListener("click", function(){
    let newone = interestsdiv.cloneNode(true);
    let input = newone.getElementsByTagName("input")[0];
    interests.style.margin = "1px" ;
    input.value='';
    interests.appendChild(newone)
})