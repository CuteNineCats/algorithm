------------
data: {

  sortKeyMap: {},
  updateKeyMap: {},
  sortKeyConstants:
  { sortKeyCriticalAccuracy: 0.1, 
    sortKeyCriticalCongestionPercentage: 0.5,
    sortKeyInterval: 10,
    sortKeyRange: 10 }

}

------------


  // make one node go down one step
  clickDownMethod(index) {
    Message.success('down down down !')
    const records = this.pageData.records
    const a = records[index]
    const b = records[index + 1]
    // the new value is the average of two adjacent value 
    if (index + 2 < this.pageData.total) {
      const c = records[index + 2]
      a.sortKey = (b.sortKey + c.sortKey) / 2
      this.updateMap[a.id] = a.sortKey
    } else {
      const tmp = a.sortKey
      a.sortKey = b.sortKey
      b.sortKey = tmp
    }
    this.pageData.records.splice(index, 2, b, a)
  },
  // make one node go down one step
  clickUpMethod(index) {
    Message.success('up up up !')
    const records = this.pageData.records
    const a = records[index - 1]
    const b = records[index]
    if (index - 2 >= 0) {
      const c = records[index - 2]
      b.sortKey = (a.sortKey + c.sortKey) / 2
      this.updateMap[b.id] = b.sortKey
    } else {
      const tmp = a.sortKey
      a.sortKey = b.sortKey
      b.sortKey = tmp
    }
    this.pageData.records.splice(index - 1, 2, b, a)
  },
  // make one node to any position
  sortByIndex(from, to) {
    const records = this.pageData.records
    const a = records[from]
    const b = records[to]
    const tmp = a.sortKey
    a.sortKey = b.sortKey
    b.sortKey = tmp
    records.splice(from, 1, b)
    records.splice(to, 1, a)
  },
  // whether the accuracy difference is less than the limit gate value
  checkPrecisionDifference(a, b) {
    return Math.abs(a - b) < this.sortKeyConstants.sortKeyCriticalAccuracy
  },
  // reduce congestion
  smoothPrecision() {
    const data = this.pageData.records
    if (this.pageData.total >= 2 && this.checkPrecisionDifference(data[0].sortKey, data[1].sortKey)) {
      data[0].sortKey = data[0].sortKey + this.sortKeyConstants.sortKeyInterval
    }
    for (let i = 1; i < this.pageData.total - 1; ++i) {
      if (this.checkPrecisionDifference(data[i].sortKey, data[i + 1].sortKey)) {
        data[i].sortKey = (data[i - 1].sortKey + data[i + 1].sortKey) / 2
      }
    }
  },
  // whether two nodes in one range
  checkInRange(a, b) {
    return Math.abs(a - b) < this.sortKeyConstants.sortKeyRange
  },
  // whether exceed the congestion percentage
  exceedTheCongestionPercentage(count, total) {
    return (count / total) >= this.sortKeyConstants.sortKeyCriticalCongestionPercentage
  },
  // check congestion in range to determine to execute redeploy method
  checkCongestion() {
    const data = this.pageData.records
    let preIndex = 0
    for (let i = 1; i < this.pageData.total; ++i) {
      while (preIndex < i && (!this.checkInRange(data[i].sortKey, data[preIndex].sortKey))) {
        preIndex += 1
      }
      const num = (i - preIndex + 1)
      // if exceed the congestion percentage, redeploy sortKeys all
      if (this.exceedTheCongestionPercentage(num, this.pageData.total)) {
        this.reDeploySortKey()
        return
      }
    }
  },
  // 重置所有护理项目的sortKey
  reDeploySortKey() {
    // 每个节点之间相隔 sortKeyConstants.sortKeyInterval
    const data = this.pageData.records
    for (let i = 0; i < this.pageData.total; ++i) {
      data[i].sortKey = (i + 1) * this.sortKeyConstants.sortKeyInterval
    }
  },
  clearPostData() {
    this.pageData.records.forEach(item => {
      this.sortKeyMap[item.id] = item.sortKey
    })
    this.updateMap = {}
  },
  confirm() {
    // 如果后端返回的 sortKey 相关基本常量为空，退出方法
    if (isNull(this.sortKeyConstants)) {
      console.error('sortKeyConstants is empty!')
      return
    }
    this.checkCongestion()
    this.smoothPrecision()
    this.pageData.records.forEach(item => {
      if (this.sortKeyMap[item.id] !== item.sortKey) {
        this.updateMap[item.id] = parseFloat(item.sortKey).toFixed(5)
      }
    })
    requestApi.request_post(url + '/updateBatchSortKey', this.updateMap).then(res => {
      if (res && res.code === 1000) {
        Message.success({
          showClose: true,
          message: '保存成功'
        })
        this.clearPostData()
      }
    }).catch(err => {
      console.error(err)
    })
  }
