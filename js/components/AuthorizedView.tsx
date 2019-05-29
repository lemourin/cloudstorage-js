import * as React from "react";
import { CloudFactory, CloudToken, CloudError } from "js/cloudstorage";

interface AuthorizedViewProps {
    factory: CloudFactory,
    accountType: string
    authorizationCode: string
};

interface AuthorizedViewState {
    token: (CloudToken | null),
    error: (CloudError | null)
}

export default class AuthorizedView extends React.Component<AuthorizedViewProps, AuthorizedViewState> {
    state = {
        token: null,
        error: null
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

            this.setState({ token });

            try {
                const data = await access.generalData();
                console.log(data.userName, data.spaceUsed, data.spaceTotal);
            } catch (e) {
                console.log("general data failed");
                throw e;
            } finally {
                access.destroy();
            }
        } catch (e) {
            console.log(e);
            throw e;
            this.setState({ error: e });
        }
    }

    renderToken() {
        if (!this.state.error && !this.state.token)
            return <div>Exchange in progress</div>;
        else if (this.state.error !== null) {
            const error: CloudError = this.state.error!;
            return <div>Failed to exchange code {error.description}</div>;
        } else {
            const token: CloudToken = this.state.token!;
            return <div>
                <p>Token: {token.token}</p>
                <p>AccessToken: {token.accessToken}</p>
            </div>;
        }
    }

    render() {
        return <div>
            <div>Account type: {this.props.accountType}</div>
            <div>Code: {this.props.authorizationCode}</div>
            {this.renderToken()}
        </div>
    }
};