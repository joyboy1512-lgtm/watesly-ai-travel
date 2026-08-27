"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const hotelbeds_content_mapper_1 = require("./hotelbeds-content-mapper");
(0, node_test_1.default)("roomGalleryFor never borrows another room's photos", () => {
    const galleries = {
        "DBL.ST": ["https://cdn/dbl.jpg"],
        "SUI.AS": ["https://cdn/suite.jpg"],
        __hotel__: ["https://cdn/hotel.jpg"],
    };
    strict_1.default.deepEqual((0, hotelbeds_content_mapper_1.roomGalleryFor)(galleries, "DBL.ST-1", galleries.__hotel__), [
        "https://cdn/dbl.jpg",
    ]);
    strict_1.default.deepEqual((0, hotelbeds_content_mapper_1.roomGalleryFor)(galleries, "TWN.ST", galleries.__hotel__), [
        "https://cdn/hotel.jpg",
    ]);
    strict_1.default.notDeepEqual((0, hotelbeds_content_mapper_1.roomGalleryFor)(galleries, "TWN.ST", galleries.__hotel__), [
        "https://cdn/suite.jpg",
    ]);
});
//# sourceMappingURL=hotelbeds-room-gallery.test.js.map