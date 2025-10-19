class RuleSetting {
  isActive = false;
  weight = 0;
  record = {};
  nameOverride;
  internalConfig = {};
  key;
}
class Rule {
  key;
  description;
  isActive = false;
  weight = 1;
  notifySelectedCell(_cell, _ctx) {
  }
  initialize(config) {
    this.isActive = config.isActive;
    this.weight = config.weight;
    this.name = config.nameOverride ?? this.name;
    this.key = config.key ?? this.name;
    for (const [recordName, recordValue] of Object.entries(config.record)) {
      if (recordName in this.configValues) {
        this.configValues[recordName] = recordValue;
      }
    }
    if (config.internalConfig) {
      for (const [recordName, recordValue] of Object.entries(config.internalConfig)) {
        if (recordName in this) {
          this[recordName] = recordValue;
        } else {
          console.log("Unable to find " + recordName + " in " + this.name);
        }
      }
    }
  }
  prepare() {
  }
  // Optionally overridden
  scoreAllCells(filter, ctx, regionIdGetter, weight = 1) {
    for (const cell of ctx.cells) {
      if (filter(cell)) {
        ctx.region = regionIdGetter(cell);
        cell.currentScore += this.score(cell, ctx) * weight;
      }
    }
  }
  scoreCells(cells, ctx, regionIdGetter, weight = 1) {
    for (const cell of cells) {
      ctx.region = regionIdGetter(cell);
      cell.currentScore += this.score(cell, ctx) * weight;
    }
  }
}

export { Rule, RuleSetting };
//# sourceMappingURL=rules-base.js.map
