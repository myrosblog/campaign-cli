import * as chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

global.expect = chai.expect;

import "./main.spec.js";