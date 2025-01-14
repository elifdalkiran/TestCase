Vue.component("bar-chart", {
  extends: VueChartJs.Bar,
  props: ["chartData", "options"],
  mounted() {
    this.renderChart(this.chartData, this.options);
  },
  watch: {
    // Chart data güncellendiğinde grafiği yeniden oluştur
    chartData: {
      handler(newData) {
        this.renderChart(newData, this.options);
      },
      deep: true,
    },
  },
});
var app = new Vue({
  el: '#app',
  data() {
    return {
      baseURL: 'https://iapitest.eva.guru',
      email: '',
      password: '',
      statusMessage: '',
      statusClass: '',
      statusShow: false,
      accessToken: '',
      isLogin: false,
      dailySalesOverviewData: {
        marketplace: "",
        sellerId: "",
        requestStatus: 0,
        day: 0,
        excludeYoYData: true
      },
      chartData: {
        labels: [], // X ekseni tarihleri
         datasets: [
        {
          label: "Profit",
          backgroundColor: "#70eec4",
          data: [], // Profit verileri
        },
        {
          label: "FBA Sales",
          backgroundColor: "#8187E7",
          data: [], // FBA Sales verileri
        },
        {
          label: "FBM Sales",
          backgroundColor: "#5D32E5",
          data: [], // FBM Sales verileri
        },
      ],
        },
      // Grafik ayarları
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true, // Başlığı göstermek için true yapılır
            text: "Daily Sales", // Başlık metni
            align: "start",
            font: {
              size: 18, // Başlık yazı tipi boyutu
            },
            padding: {
              top: 10, // Başlık ile grafik arasındaki boşluk
              bottom: 20, // Alt taraf boşluğu
            },
          },
          legend: {
            display: true, // Grafik için açıklama (legend)
            position: "bottom", // Legend pozisyonu
            pointStyle: 'circle', // Legend'deki simgeleri yuvarlak yapmak
            usePointStyle: true,
          },
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: "Dates",
            },
            grid: {
            display: false, // X eksenindeki grid çizgilerini gizle
          },
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: "Amount ($)",
            },
          },
        },
        onClick: this.onChartClick, // Tıklama olayını bağla
      },
      selectedDays: 30,
      clickedDates: [], // Seçilen kolonlar
      tableData: [],// Tablo verisi
      dailySalesSkuListData: {
        marketplace: "",
        sellerId: "",
        salesDate: "",
        salesDate2: "",
        pageSize: 30,
        pageNumber: 1,
        isDaysCompare: null
      },
      skuRefundRateData: {
        marketplace: "",
        sellerId: "",
        skuList: [],
        requestedDay: 0
      }
      };
  },  
  methods: {
    async handleLogin() {
      try {
        const response = await axios.post(this.baseURL + '/oauth/token', {
          Email: this.email,
          Password: this.password,
          GrantType: "password",
          Scope: "amazon_data",
          ClientId: "C0001",
          ClientSecret: "SECRET0001",
          RedirectUri: "https://api.eva.guru"
        });

        // Success
        this.isLogin = true;
        this.statusMessage = 'Login successful!';
        this.statusClass = 'text-green-500';
        console.log('Response:', response.data);
        this.accessToken = response.data.Data.AccessToken;
        console.log('accessToken:', this.accessToken);
        this.userInfo(this.email, this.accessToken);
      } catch (error) {
        // Error
        this.statusShow = true;
        this.statusMessage = 'Login failed. Please try again.';
        this.statusClass = 'text-red-500';
        console.error('Error:', error.response ? error.response.data : error.message);
      }
    },
    userInfo(email, accessToken) {
      const config = {
        headers: {
          Authorization: 'Bearer ' + accessToken, // Örnek bir header
          'Content-Type': 'application/json', // İçerik türü
        },
      };
      const data = {
        email: email,
      };
      axios.post(this.baseURL + '/user/user-information', data, config).then(response => {
        console.log('Response2:', response.data);
        this.dailySalesOverviewData.marketplace = response.data.Data.user.store[0].marketplaceName;
        this.dailySalesOverviewData.sellerId = response.data.Data.user.store[0].storeId;
        this.dailySalesSkuListData.marketplace = response.data.Data.user.store[0].marketplaceName;
        this.dailySalesSkuListData.sellerId = response.data.Data.user.store[0].storeId;
        this.skuRefundRateData.marketplace = response.data.Data.user.store[0].marketplaceName;
        this.skuRefundRateData.sellerId = response.data.Data.user.store[0].storeId;
        
        this.dailySalesOverview(this.dailySalesOverviewData, accessToken)
      }).catch(error => {
        console.error('Hata:', error);
      });
    },
    dailySalesOverview(data) {
      data.day = this.selectedDays;
      axios.post(this.baseURL + '/data/daily-sales-overview/', data, {
        headers: {
          Authorization: 'Bearer ' + this.accessToken,
          'Content-Type': 'application/json',
        },
      }).then(response => {
        console.log('Response3', response.data);
        
        // xAxis.categories'yi güncelle
        this.chartData.labels = response.data.Data.item.map(i => i.date); // Veriyi al ve xAxis'e ekle
        this.chartData.datasets[0].data = response.data.Data.item.map(i => i.profit);
        this.chartData.datasets[1].data = response.data.Data.item.map(i => i.fbaAmount);
        this.chartData.datasets[2].data = response.data.Data.item.map(i => i.fbmAmount);
      }).catch(error => {
        console.error('Error:', error);
      });
    },
    dailySalesSkuList(data) {
        axios.post(this.baseURL + '/data/daily-sales-sku-list/', data, {
          headers: {
          Authorization: 'Bearer ' + this.accessToken,
          'Content-Type': 'application/json',
        },
        }).then(response => {
          if(response.data.Data.item.skuList.length > 0) {
          this.skuRefundRateData.skuList = response.data.Data.item.skuList.map(item => item.sku);
          this.getSkuRefundRate(this.skuRefundRateData);
          }
          this.tableData = response.data.Data.item;
        }).catch(error => {console.error("Error fetching data:", error);
        });
    },
    getSkuRefundRate(data) {
      axios.post(this.baseURL + '/data/get-sku-refund-rate/', data, {
        headers: {
        Authorization: 'Bearer ' + this.accessToken,
        'Content-Type': 'application/json',
      },
      }).then(response => {
        console.log('Response4', response.data)
        if(response.data.Data.length > 0) {
          response.data.Data.map(r => {
          this.tableData.skuList.map(t=> {
            if(r.sku === t.sku){
              t.refundRate = r.refundRate
            }
          })
        })
        }
        
        this.tableData = { ...this.tableData };
      }).catch(error => {console.error("Error fetching data:", error);
      });
  },
    updateChart() {
      this.dailySalesOverview(this.dailySalesOverviewData)
    },
     onChartClick(event) {
      // Chart.js instance'ına erişim
    const chart = this.$refs.barChart.$data._chart;

    // Take information of clicked element
    const activePoints = chart.getElementsAtEventForMode(
      event,
      "nearest",
      { intersect: true },
      false
    );
    // Chart.js instance ve aktif elemanları al
    const activeElements = this.$refs.barChart.chartData.labels[activePoints[0].index];
    
    if (activeElements) {
      
      console.log("Clicked Label:", activeElements);

      this.handleChartClick(activeElements); // Start process
    }
  },
  handleChartClick(clickedLabel) {
    if (!clickedLabel) return;
    if (this.clickedDates.includes(clickedLabel)) return; // same date is not select
    if (this.clickedDates.length < 2) {
      this.clickedDates.push(clickedLabel);
      this.dailySalesSkuListData.isDaysCompare = 0;
      this.dailySalesSkuListData.salesDate = this.clickedDates[0];
    }
    if (this.clickedDates.length === 2) {
      this.clickedDates.shift(); // Just 2 date 
      this.dailySalesSkuListData.salesDate = this.clickedDates[0];
      this.dailySalesSkuListData.salesDate2 = this.clickedDates[1];
      this.dailySalesSkuListData.isDaysCompare = 1;
      this.dailySalesSkuList(this.dailySalesSkuListData);
    }
    this.dailySalesSkuList(this.dailySalesSkuListData);
  },
  },
});
