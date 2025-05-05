import { NewPoratal } from './newPortal';

class PortalManager {
    private static instance: PortalManager;
    private portal: NewPoratal | null = null;
    private isInitialized: boolean = false;
    private isLoggedIn: boolean = false;

    private constructor() {}

    public static getInstance(): PortalManager {
        if (!PortalManager.instance) {
            PortalManager.instance = new PortalManager();
        }
        return PortalManager.instance;
    }

    public async initializePortal(registrationNumber: string, password: string): Promise<boolean> {
        if (this.isInitialized && this.isLoggedIn) {
            return true;
        }

        try {
            this.portal = new NewPoratal(registrationNumber, password);
            this.isInitialized = await this.portal.initialize();
            
            if (this.isInitialized) {
                this.isLoggedIn = await this.portal.login(registrationNumber, password);
                return this.isLoggedIn;
            }
            return false;
        } catch (error) {
            this.portal = null;
            this.isInitialized = false;
            this.isLoggedIn = false;
            throw error;
        }
    }

    public getPortal(): NewPoratal | null {
        return this.portal;
    }

    public isPortalReady(): boolean {
        return this.isInitialized && this.isLoggedIn;
    }

    public async closePortal(): Promise<void> {
        if (this.portal) {
            await this.portal.close();
            this.portal = null;
            this.isInitialized = false;
            this.isLoggedIn = false;
        }
    }
}

export const portalManager = PortalManager.getInstance(); 