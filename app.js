const parkingList = document.querySelector("#parking-list");
const statusMessage = document.querySelector("#status-message");

const prevButton = document.querySelector("#prev-button");
const nextButton = document.querySelector("#next-button");
const pageInfo = document.querySelector("#page-info");

// 한 페이지에 표시할 주차장 수
const numOfRows = 10;

// 현재 페이지
let currentPage = 1;

// 전체 페이지 수
let totalPages = 1;

// 주차장 목록 불러오기
async function loadParkingList(pageNo) {
  statusMessage.textContent =
    "주차장 정보를 불러오는 중입니다.";

  prevButton.disabled = true;
  nextButton.disabled = true;

  try {
    const response = await fetch(
      `/api/parking?pageNo=${pageNo}&numOfRows=${numOfRows}`
    );

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.response.header.resultCode !== "00") {
      throw new Error(data.response.header.resultMsg);
    }

    const body = data.response.body;
    let items = body.items?.item || [];

    // 데이터가 한 건만 와도 배열로 처리
    if (!Array.isArray(items)) {
      items = [items];
    }

    const totalCount = Number(body.totalCount);

    totalPages = Math.ceil(totalCount / numOfRows);
    currentPage = pageNo;

    // 기존 목록 삭제
    parkingList.innerHTML = "";

    // 새로운 목록 출력
    items.forEach((parking) => {
      const row = document.createElement("tr");

      const codeCell = document.createElement("td");
      codeCell.textContent = parking.parkgcd;

      const nameCell = document.createElement("td");
      nameCell.textContent = parking.parknm;

      row.appendChild(codeCell);
      row.appendChild(nameCell);

      parkingList.appendChild(row);
    });

    statusMessage.textContent =
      `전체 ${totalCount}개 중 ${items.length}개를 표시했습니다.`;

    pageInfo.textContent =
      `${currentPage} / ${totalPages}`;

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  } catch (error) {
    parkingList.innerHTML = "";

    statusMessage.textContent =
      `주차장 정보를 불러오지 못했습니다: ${error.message}`;

    pageInfo.textContent = "- / -";
  }
}

// 이전 버튼
prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    loadParkingList(currentPage - 1);
  }
});

// 다음 버튼
nextButton.addEventListener("click", () => {
  if (currentPage < totalPages) {
    loadParkingList(currentPage + 1);
  }
});

// 처음에는 1페이지를 불러옵니다.
loadParkingList(1);