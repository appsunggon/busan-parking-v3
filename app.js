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

// 전체 데이터를 불러오는 중복 요청 방지
let allParkingLoadingPromise = null;

// 실시간 검색 대기 시간
let searchTimer;


// 검색어와 주차장명을 비교하기 좋은 형태로 변경
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}


// API에서 특정 페이지 가져오기
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


// API의 item을 항상 배열로 변환
function getItems(body) {
  let items = body.items?.item || [];

  if (!Array.isArray(items)) {
    items = [items];
  }

  return items;
}


// 주차장 목록을 표에 출력
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


// 전체 데이터를 10개씩 나누어 불러오기
async function loadAllParkingData() {
  // 이미 불러온 전체 데이터가 있으면 바로 사용
  if (allParkingData !== null) {
    return allParkingData;
  }

  // 이미 전체 데이터를 불러오는 중이면 같은 작업을 기다림
  if (allParkingLoadingPromise !== null) {
    return allParkingLoadingPromise;
  }

  allParkingLoadingPromise = (async () => {
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

    return combinedData;
  })();

  try {
    allParkingData = await allParkingLoadingPromise;

    return allParkingData;
  } finally {
    allParkingLoadingPromise = null;
  }
}


// 입력한 글자로 시작하는 주차장 검색
async function searchParking() {
  let keyword = normalizeText(searchInput.value);

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

    // 데이터를 불러오는 중 검색어가 바뀔 수 있으므로 다시 확인
    keyword = normalizeText(searchInput.value);

    // 검색어가 지워졌으면 첫 페이지로 돌아가기
    if (keyword === "") {
      loadParkingList(1);
      return;
    }

    const searchResults = parkingData.filter((parking) => {
      const parkingName = normalizeText(parking.parknm);

      // 입력한 글자로 시작하는 주차장만 검색
      return parkingName.startsWith(keyword);
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


// 검색을 초기화하고 첫 페이지 표시
function resetSearch() {
  searchInput.value = "";

  loadParkingList(1);
}


// 검색 버튼을 눌렀을 때
searchButton.addEventListener("click", searchParking);


// Enter 키를 눌렀을 때
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    clearTimeout(searchTimer);
    searchParking();
  }
});


// 검색어를 입력하면 0.3초 후 자동 검색
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    const keyword = normalizeText(searchInput.value);

    if (keyword === "") {
      loadParkingList(1);
    } else {
      searchParking();
    }
  }, 300);
});


// 전체보기 버튼
resetButton.addEventListener("click", () => {
  clearTimeout(searchTimer);
  resetSearch();
});


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