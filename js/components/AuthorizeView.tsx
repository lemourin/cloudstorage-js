import * as React from "react";
import Input from "react-toolbox/lib/input";
import { Button } from "react-toolbox/lib/button";
import { Redirect } from "react-router-dom";

interface AuthorizeViewProps {
    match: any
}

interface AuthorizeViewState {
    username: string,
    password: string,
    endpoint: string,
    twofactor: string,
    bucket: string,
    submitClicked: boolean
}

export default class AuthorizeView extends React.Component<AuthorizeViewProps, AuthorizeViewState> {
    state = {
        username: "",
        password: "",
        endpoint: "",
        twofactor: "",
        bucket: "",
        submitClicked: false
    }

    handleChange = (name: string, value: string) => {
        this.setState({ ...this.state, [name]: value });
    };

    submitClicked = () => {
        if (!this.state.submitClicked)
            this.setState({ submitClicked: true });
    }

    renderAuthForm = (type: string) => {
        return <div>
            <Input
                type="text" name="username" label="Username" value={this.state.username}
                onChange={this.handleChange.bind(this, "username")} />
            <Input
                type="password" name="password" label="Password" value={this.state.password}
                onChange={this.handleChange.bind(this, "password")} />
            {type == "mega" &&
                <Input
                    type="text" name="twofactor" label="Two Factor Code" value={this.state.twofactor}
                    onChange={this.handleChange.bind(this, "twofactor")} />
            }
            {type == "amazons3" &&
                <div>
                    <Input
                        type="text" name="bucket" label="Bucket" value={this.state.bucket}
                        onChange={this.handleChange.bind(this, "hostname")} />
                </div>
            }
            {(type == "webdav" || type == "amazons3") &&
                <Input
                    type="text" name="endpoint" label="Endpoint" value={this.state.endpoint}
                    onChange={this.handleChange.bind(this, "endpoint")} />
            }
        </div>
    }

    generateCode = (type: string) => {
        if (type == "amazons3")
            return {
                username: this.state.username,
                password: this.state.password,
                endpoint: this.state.endpoint,
                bucket: this.state.bucket
            }
        else if (type == "mega")
            return {
                username: this.state.username,
                password: this.state.password,
                twofactor: this.state.twofactor
            }
        else if (type == "webdav")
            return {
                username: this.state.username,
                password: this.state.password,
                endpoint: this.state.endpoint
            }
        else return {
            username: this.state.username,
            password: this.state.password
        }
    }

    render() {
        const accountType = this.props.match.params.accountType;
        if (this.state.submitClicked || accountType == "animezone") {
            const encoded = window.btoa(encodeURIComponent(JSON.stringify(this.generateCode(accountType))));
            return <Redirect to={`/authorized/${accountType}/${encodeURIComponent(encoded)}`} />
        } else {
            return <form>
                <header>{accountType} login</header>
                {this.renderAuthForm(accountType)}
                <Button label="Submit" onClick={this.submitClicked} />
            </form>
        }
    }
};