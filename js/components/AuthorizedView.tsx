import * as React from "react";
import { CloudFactory, CloudToken, CloudError } from "js/cloudstorage";
import { HashRouter as Router, Redirect } from "react-router-dom";

interface AuthorizedViewProps {
    factory: CloudFactory,
    accountType: string
    authorizationCode: string
};

interface AuthorizedViewState {
    error: (CloudError | null),
    pending: boolean,
}

export default class AuthorizedView extends React.Component<AuthorizedViewProps, AuthorizedViewState> {
    state = {
        error: null,
        pending: true
    }

    async componentDidMount() {
        try {
            const token = await this.props.factory.exchangeAuthorizationCode(
                this.props.accountType,
                {
                    redirectUri: process.env.HOSTNAME,
                    state: this.props.accountType
                },
                this.props.authorizationCode
            );

            const access = this.props.factory.createAccess(this.props.accountType, token.token, {
                accessToken: token.accessToken,
                redirectUri: process.env.HOSTNAME,
                state: this.props.accountType
            });

            try {
                const data = await access.generalData();
                const json = JSON.parse(localStorage.getItem("accounts") || "[]");
                if (!json.find((e: any) => { return e.type === this.props.accountType && e.label === data.userName; })) {
                    json.push({
                        type: this.props.accountType,
                        label: data.userName,
                        token: token.token,
                        accessToken: token.accessToken
                    });
                    localStorage.setItem("accounts", JSON.stringify(json));
                }
            } catch (e) {
                throw e;
            } finally {
                this.props.factory.removeAccess(access);
                access.destroy();
            }
        } catch (e) {
            this.setState({ error: e, pending: false });
        } finally {
            this.setState({ pending: false });
        }
    }

    renderToken() {
        if (this.state.pending)
            return <div>Verifying...</div>;
        else if (this.state.error !== null) {
            const error: CloudError = this.state.error!;
            return <div>Failed to exchange code {error.description}</div>;
        } else {
            return null;
        }
    }

    render() {
        if (!this.state.pending && !this.state.error)
            return <Redirect to="/" />;
        return <div>
            <div>Account type: {this.props.accountType}</div>
            <div>Code: {this.props.authorizationCode}</div>
            {this.renderToken()}
        </div>
    }
};