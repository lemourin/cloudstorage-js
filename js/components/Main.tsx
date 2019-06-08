import * as React from "react";

import { CloudFactory, CloudAccess } from "../cloudstorage";

import { AppBar } from "react-toolbox/lib/app_bar";
import { Layout, NavDrawer, Panel } from "react-toolbox/lib/layout";
import { List, ListItem } from "react-toolbox/lib/list";
import { Route, Link } from "react-router-dom";
import { AddAccount } from "./AddAccount";
import AuthorizedView from "./AuthorizedView";
import AuthorizeView from "./AuthorizeView";
import ListView from "./ListView";
import ViewItem from "./ViewItem";

export interface CloudAccount {
    type: string,
    label: string,
    token: string,
    accessToken: string
}

interface LocationState {
    accounts: CloudAccount[]
}

interface LocationProps {
    state: LocationState
}

interface MainProps {
    location: LocationProps
}

interface MainState {
    factory: CloudFactory,
    access: { [key in string]: CloudAccess },
    drawerActive: boolean,
    authorizationCode: string,
    authorizationAccountType: string,
    accounts: CloudAccount[]
};

export class Main extends React.Component<MainProps, MainState> {
    state = {
        factory: new CloudFactory(process.env.HOSTNAME!),
        access: {},
        drawerActive: false,
        authorizationCode: "",
        authorizationAccountType: "",
        accounts: JSON.parse(localStorage.getItem("accounts") || "[]"),
    }

    constructor(props: MainProps) {
        super(props);
        this.state.factory.loadConfig({
            keys: {
                google: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                },
                gphotos: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                },
                youtube: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                },
                pcloud: {
                    client_id: "7HVDWAU1tGj",
                    client_secret: "lTn56JN4jQXPh6T4MqJb88BSOhhy"
                },
                hubic: {
                    client_id: "api_hubic_QviFuHPiH3XZouEUJuJ5NFnCzcG8Y0Cp",
                    client_secret: "5D4M69qpIjyEHYOzbTs06olydCek5oUOvh1ROvWsHQbSOy9o1v3i2lUbygC7gzig"
                }
            }
        });
        this.updateAccounts([], this.state.accounts);
    }

    toggleDrawerActive = () => {
        this.setState({ drawerActive: !this.state.drawerActive })
    }

    updateAccounts = (oldAccounts: CloudAccount[], accounts: CloudAccount[]) => {
        const access: { [key in string]: CloudAccess } = this.state.access;
        for (const d of accounts) {
            if (!oldAccounts.find((e: CloudAccount) => { return e.type == d.type && e.label == d.label; })) {
                const key = d.type + "/" + d.label;
                access[key] = this.state.factory.createAccess(d.type, d.token, {
                    accessToken: d.accessToken,
                    redirectUri: process.env.HOSTNAME,
                    state: d.type
                });
            }
        }
        return access;
    }

    access = (name: string, label: string) => {
        const access: { [key in string]: CloudAccess } = this.state.access;
        return access[name + "/" + label];
    }

    componentDidUpdate() {
        if (this.props.location && this.props.location.state && this.props.location.state.accounts &&
            this.props.location.state.accounts != this.state.accounts) {
            this.setState({ access: this.updateAccounts(this.state.accounts, this.props.location.state.accounts) });
            this.setState({ accounts: this.props.location.state.accounts });
        }
    }

    componentWillUnmount() {
        this.state.factory.destroy();
    }

    render() {
        return <Layout>
            <NavDrawer active={this.state.drawerActive} onOverlayClick={this.toggleDrawerActive}>
                <List>
                    {
                        this.state.accounts.map((account: CloudAccount) => {
                            const key = `${account.type}/${encodeURIComponent(account.label)}`;
                            return <Link key={key} to={`/list/${key}/`}>
                                <ListItem caption={`${account.type}: ${account.label}`} onClick={this.toggleDrawerActive} />
                            </Link>;
                        })
                    }
                    <Link to="/add_account/">
                        <ListItem caption="Add account" onClick={this.toggleDrawerActive} />
                    </Link>
                    <Link to="/">
                        <ListItem caption="Main page" onClick={this.toggleDrawerActive} />
                    </Link>
                </List>
            </NavDrawer>
            <Panel>
                <AppBar leftIcon="menu" onLeftIconClick={this.toggleDrawerActive} />
                <Route path="/add_account/" exact render={() => { return <AddAccount factory={this.state.factory} />; }} />
                <Route path="/auth/:accountType" component={AuthorizeView} />
                <Route path="/authorized/:accountType/:code(.*)" render={
                    (props: any) => {
                        return <AuthorizedView
                            factory={this.state.factory}
                            accountType={props.match.params.accountType}
                            authorizationCode={decodeURIComponent(props.match.params.code)} />
                    }
                } />
                <Route path="/list/:accountType/:accountLabel([^/]*)/:path(.*)" render={
                    (props: any) => {
                        const access = this.access(props.match.params.accountType, decodeURIComponent(props.match.params.accountLabel));
                        return <ListView
                            {...props}
                            access={access}
                            path={`/${props.match.params.path}`} />
                    }
                } />
                <Route path="/view-item/:accountType/:accountLabel([^/]*)/:path(.*)" render={
                    (props: any) => {
                        const access = this.access(props.match.params.accountType, decodeURIComponent(props.match.params.accountLabel));
                        return <ViewItem
                            {...props}
                            access={access}
                            path={`${decodeURIComponent(props.match.params.path)}`}
                        />
                    }
                } />
            </Panel>
        </Layout>;
    }
}