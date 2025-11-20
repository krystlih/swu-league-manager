"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueStatus = exports.CompetitionType = void 0;
var CompetitionType;
(function (CompetitionType) {
    CompetitionType["SWISS"] = "SWISS";
    CompetitionType["SWISS_WITH_TOP_CUT"] = "SWISS_WITH_TOP_CUT";
    CompetitionType["DOUBLE_ELIMINATION"] = "DOUBLE_ELIMINATION";
    CompetitionType["SINGLE_ELIMINATION"] = "SINGLE_ELIMINATION";
})(CompetitionType || (exports.CompetitionType = CompetitionType = {}));
var LeagueStatus;
(function (LeagueStatus) {
    LeagueStatus["REGISTRATION"] = "REGISTRATION";
    LeagueStatus["IN_PROGRESS"] = "IN_PROGRESS";
    LeagueStatus["TOP_CUT"] = "TOP_CUT";
    LeagueStatus["COMPLETED"] = "COMPLETED";
    LeagueStatus["CANCELLED"] = "CANCELLED";
})(LeagueStatus || (exports.LeagueStatus = LeagueStatus = {}));
