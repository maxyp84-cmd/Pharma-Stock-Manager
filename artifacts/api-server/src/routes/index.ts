import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import branchesRouter from "./branches";
import categoriesRouter from "./categories";
import suppliersRouter from "./suppliers";
import productsRouter from "./products";
import stockRouter from "./stock";
import salesRouter from "./sales";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(branchesRouter);
router.use(categoriesRouter);
router.use(suppliersRouter);
router.use(productsRouter);
router.use(stockRouter);
router.use(salesRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
