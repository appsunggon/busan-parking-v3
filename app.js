const parkingList = document.querySelector("#parking-list");
const statusMessage = document.querySelector("#status-message");

const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const resetButton = document.querySelector("#reset-button");

const pagination = document.querySelector("#pagination");
const prevButton = document.querySelector("#prev-button");
const nextButton = document.querySelector("#next-button");
const pageInfo = document.querySelector("#page-info");

// 한 페이지에 요청할 주차장 수
const numOfRows = 10;

// 현재 페이지
let currentPage = 1;

// 전체 페이지 수
let totalPages = 1;

// 검색을 위해 불러온 전체 주차장 데이터
let allParkingData = null;

// API에서 특정 페이지를 가져오는 함수
async function fetchParkingPage(pageNo) {
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

  return data.response.body;
}

// API의 item을 항상 배열로 바꾸는 함수
function getItems(body) {
  let items = body.items?.item || [];

  if (!Array.isArray(items)) {
    items = [items];
  }

  return items;
}

// 주차장 목록을 표에 출력하는 함수
function displayParkingList(items) {
  parkingList.innerHTML = "";

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 2;
    cell.className = "empty-message";
    cell.textContent = "검색 결과가 없습니다.";

    row.appendChild(cell);
    parkingList.appendChild(row);

    return;
  }

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
}

// 일반 페이지 목록 불러오기
async function loadParkingList(pageNo) {
  statusMessage.textContent =
    "주차장 정보를 불러오는 중입니다.";

  pagination.hidden = false;

  prevButton.disabled = true;
  nextButton.disabled = true;

  try {
    const body = await fetchParkingPage(pageNo);
    const items = getItems(body);

    const totalCount = Number(body.totalCount);

    totalPages = Math.ceil(totalCount / numOfRows);
    currentPage = pageNo;

    displayParkingList(items);

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

// 전체 50개를 10개씩 나누어 불러오기
async function loadAllParkingData() {
  // 이미 전체 데이터를 불러왔다면 다시 호출하지 않음
  if (allParkingData !== null) {
    return allParkingData;
  }

  const firstBody = await fetchParkingPage(1);
  const totalCount = Number(firstBody.totalCount);
  const pageCount = Math.ceil(totalCount / numOfRows);

  let combinedData = getItems(firstBody);

  for (let page = 2; page <= pageCount; page++) {
    statusMessage.textContent =
      `전체 주차장 정보를 불러오는 중입니다. (${page}/${pageCount})`;

    const body = await fetchParkingPage(page);
    const items = getItems(body);

    combinedData = combinedData.concat(items);
  }

  // 합친 50개를 브라우저에 저장
  allParkingData = combinedData;

  return allParkingData;
}

// 주차장 검색
async function searchParking() {
  const keyword = searchInput.value.trim().toLowerCase();

  if (keyword === "") {
    loadParkingList(1);
    return;
  }

  searchButton.disabled = true;
  resetButton.disabled = true;
  pagination.hidden = true;

  statusMessage.textContent =
    "전체 주차장에서 검색하고 있습니다.";

  try {
    const parkingData = await loadAllParkingData();

    const searchResults = parkingData.filter((parking) => {
      const parkingName =
        String(parking.parknm || "").toLowerCase();

      return parkingName.includes(keyword);
    });

    displayParkingList(searchResults);

    statusMessage.textContent =
      `검색된 주차장: ${searchResults.length}개`;
  } catch (error) {
    parkingList.innerHTML = "";

    statusMessage.textContent =
      `검색 중 오류가 발생했습니다: ${error.message}`;
  } finally {
    searchButton.disabled = false;
    resetButton.disabled = false;
  }
}

// 전체보기
function resetSearch() {
  searchInput.value = "";

  loadParkingList(1);
}

// 검색 버튼
searchButton.addEventListener("click", searchParking);

// 입력창에서 Enter 키를 눌러도 검색
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchParking();
  }
});

// 전체보기 버튼
resetButton.addEventListener("click", resetSearch);

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

// 처음에는 1페이지 표시
loadParkingList(1);